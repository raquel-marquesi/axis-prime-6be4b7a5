import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface ParsedEntry {
  data_transacao: string
  descricao: string
  valor: number
  tipo: 'credito' | 'debito'
}

function parseCSV(content: string): ParsedEntry[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []

  // Detect delimiter
  const firstLine = lines[0]
  const delimiter = firstLine.includes(';') ? ';' : ','

  const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''))

  // Find column indexes
  const dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date'))
  const descIdx = headers.findIndex(h => h.includes('descri') || h.includes('hist') || h.includes('description'))
  const valorIdx = headers.findIndex(h => h.includes('valor') || h.includes('value') || h.includes('amount'))

  if (dateIdx === -1 || valorIdx === -1) {
    throw new Error('CSV deve conter colunas de data e valor')
  }

  const entries: ParsedEntry[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = line.split(delimiter).map(c => c.trim().replace(/"/g, ''))
    const rawDate = cols[dateIdx]
    const rawValor = cols[valorIdx]
    const descricao = descIdx >= 0 ? cols[descIdx] : 'Sem descrição'

    if (!rawDate || !rawValor) continue

    // Parse date (DD/MM/YYYY or YYYY-MM-DD)
    let dataTransacao: string
    if (rawDate.includes('/')) {
      const parts = rawDate.split('/')
      dataTransacao = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    } else {
      dataTransacao = rawDate
    }

    // Parse valor
    const cleanValor = rawValor.replace(/[^\d,.\-]/g, '').replace(',', '.')
    const valor = parseFloat(cleanValor)
    if (isNaN(valor)) continue

    entries.push({
      data_transacao: dataTransacao,
      descricao: descricao || 'Sem descrição',
      valor: Math.abs(valor),
      tipo: valor >= 0 ? 'credito' : 'debito',
    })
  }

  return entries
}

function parseOFX(content: string): ParsedEntry[] {
  const entries: ParsedEntry[] = []

  // Extract transactions between <STMTTRN> tags
  const txnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match: RegExpExecArray | null

  while ((match = txnRegex.exec(content)) !== null) {
    const txn = match[1]

    const dtPosted = txn.match(/<DTPOSTED>(\d{8})/)?.[1]
    const trnAmt = txn.match(/<TRNAMT>([\-\d.,]+)/)?.[1]
    const memo = txn.match(/<MEMO>([^\n<]+)/)?.[1]?.trim()
    const name = txn.match(/<NAME>([^\n<]+)/)?.[1]?.trim()

    if (!dtPosted || !trnAmt) continue

    const dataTransacao = `${dtPosted.slice(0, 4)}-${dtPosted.slice(4, 6)}-${dtPosted.slice(6, 8)}`
    const valor = parseFloat(trnAmt.replace(',', '.'))
    if (isNaN(valor)) continue

    entries.push({
      data_transacao: dataTransacao,
      descricao: memo || name || 'Sem descrição',
      valor: Math.abs(valor),
      tipo: valor >= 0 ? 'credito' : 'debito',
    })
  }

  return entries
}

function detectFormat(content: string): 'csv' | 'ofx' {
  const trimmed = content.trim()
  if (trimmed.includes('<OFX>') || trimmed.includes('OFXHEADER') || trimmed.includes('<STMTTRN>')) {
    return 'ofx'
  }
  return 'csv'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { file_path, file_name, bank_name } = body

    if (!file_path || !file_name || !bank_name) {
      return new Response(JSON.stringify({ error: 'file_path, file_name e bank_name são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('bank-statements')
      .download(file_path)

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: 'Erro ao baixar arquivo: ' + downloadError?.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const content = await fileData.text()
    const format = detectFormat(content)
    const entries = format === 'ofx' ? parseOFX(content) : parseCSV(content)

    if (entries.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum lançamento encontrado no arquivo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine period
    const dates = entries.map(e => e.data_transacao).sort()
    const periodStart = dates[0]
    const periodEnd = dates[dates.length - 1]

    // Create bank_statement record
    const { data: statement, error: stmtError } = await supabase
      .from('bank_statements')
      .insert({
        file_name,
        file_path,
        bank_name,
        period_start: periodStart,
        period_end: periodEnd,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (stmtError) {
      return new Response(JSON.stringify({ error: 'Erro ao criar extrato: ' + stmtError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch invoices and expenses for auto-matching
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, valor, data_vencimento')
      .eq('status', 'emitida')

    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, valor, data_vencimento')
      .eq('status', 'pendente')

    let matchCount = 0
    const entriesToInsert = entries.map(entry => {
      let matched_invoice_id: string | null = null
      let matched_expense_id: string | null = null
      let status = 'pendente'

      if (entry.tipo === 'credito' && invoices) {
        const matches = invoices.filter(inv => {
          if (!inv.valor || !inv.data_vencimento) return false
          if (Math.abs(Number(inv.valor) - entry.valor) > 0.01) return false
          const invDate = new Date(inv.data_vencimento)
          const entryDate = new Date(entry.data_transacao)
          const diffDays = Math.abs((invDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays <= 2
        })
        if (matches.length === 1) {
          matched_invoice_id = matches[0].id
          status = 'conciliado'
          matchCount++
        }
      } else if (entry.tipo === 'debito' && expenses) {
        const matches = expenses.filter(exp => {
          if (!exp.valor || !exp.data_vencimento) return false
          if (Math.abs(Number(exp.valor) - entry.valor) > 0.01) return false
          const expDate = new Date(exp.data_vencimento)
          const entryDate = new Date(entry.data_transacao)
          const diffDays = Math.abs((expDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays <= 2
        })
        if (matches.length === 1) {
          matched_expense_id = matches[0].id
          status = 'conciliado'
          matchCount++
        }
      }

      return {
        statement_id: statement.id,
        data_transacao: entry.data_transacao,
        descricao: entry.descricao,
        valor: entry.tipo === 'debito' ? -entry.valor : entry.valor,
        tipo: entry.tipo,
        matched_invoice_id,
        matched_expense_id,
        status,
      }
    })

    const { error: insertError } = await supabase
      .from('bank_statement_entries')
      .insert(entriesToInsert)

    if (insertError) {
      // Rollback statement
      await supabase.from('bank_statements').delete().eq('id', statement.id)
      return new Response(JSON.stringify({ error: 'Erro ao inserir lançamentos: ' + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const pendingCount = entries.length - matchCount

    return new Response(JSON.stringify({
      statement_id: statement.id,
      total: entries.length,
      matched: matchCount,
      pending: pendingCount,
      format,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          module: string | null
          record_id: string | null
          result: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          module?: string | null
          record_id?: string | null
          result?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          module?: string | null
          record_id?: string | null
          result?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      accounts: {
        Row: {
          branch_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          observacoes: string | null
          responsavel_email: string | null
          responsavel_nome: string
          responsavel_telefone: string | null
          status: string
          tipo_conta: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          responsavel_email?: string | null
          responsavel_nome: string
          responsavel_telefone?: string | null
          status?: string
          tipo_conta?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string
          responsavel_telefone?: string | null
          status?: string
          tipo_conta?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_types: {
        Row: {
          area: Database["public"]["Enums"]["area_setor"] | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          weight: number
        }
        Insert: {
          area?: Database["public"]["Enums"]["area_setor"] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          weight: number
        }
        Update: {
          area?: Database["public"]["Enums"]["area_setor"] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      agent_executions: {
        Row: {
          created_at: string
          error_message: string | null
          execution_id: string
          failed_count: number | null
          finished_at: string | null
          id: string
          new_files_count: number | null
          processed_count: number | null
          started_at: string
          status: Database["public"]["Enums"]["agent_execution_status"]
          total_files_found: number | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_id: string
          failed_count?: number | null
          finished_at?: string | null
          id?: string
          new_files_count?: number | null
          processed_count?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["agent_execution_status"]
          total_files_found?: number | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_id?: string
          failed_count?: number | null
          finished_at?: string | null
          id?: string
          new_files_count?: number | null
          processed_count?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["agent_execution_status"]
          total_files_found?: number | null
        }
        Relationships: []
      }
      area_goals: {
        Row: {
          area: Database["public"]["Enums"]["area_setor"]
          created_at: string
          extra_value_per_calculation: number | null
          id: string
          monthly_goal: number
          updated_at: string
        }
        Insert: {
          area: Database["public"]["Enums"]["area_setor"]
          created_at?: string
          extra_value_per_calculation?: number | null
          id?: string
          monthly_goal: number
          updated_at?: string
        }
        Update: {
          area?: Database["public"]["Enums"]["area_setor"]
          created_at?: string
          extra_value_per_calculation?: number | null
          id?: string
          monthly_goal?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts_config: {
        Row: {
          agencia: string
          banco: string
          branch_id: string | null
          carteira: string | null
          cedente: string | null
          company_entity_id: string | null
          conta: string
          created_at: string
          descricao: string | null
          id: string
          is_active: boolean | null
          numero_convenio: string | null
          tipo: string | null
        }
        Insert: {
          agencia: string
          banco: string
          branch_id?: string | null
          carteira?: string | null
          cedente?: string | null
          company_entity_id?: string | null
          conta: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          numero_convenio?: string | null
          tipo?: string | null
        }
        Update: {
          agencia?: string
          banco?: string
          branch_id?: string | null
          carteira?: string | null
          cedente?: string | null
          company_entity_id?: string | null
          conta?: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          numero_convenio?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_config_company_entity_id_fkey"
            columns: ["company_entity_id"]
            isOneToOne: false
            referencedRelation: "company_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_entries: {
        Row: {
          created_at: string
          data_transacao: string
          descricao: string
          id: string
          matched_expense_id: string | null
          matched_invoice_id: string | null
          statement_id: string
          status: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_transacao: string
          descricao: string
          id?: string
          matched_expense_id?: string | null
          matched_invoice_id?: string | null
          statement_id: string
          status?: string
          tipo?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_transacao?: string
          descricao?: string
          id?: string
          matched_expense_id?: string | null
          matched_invoice_id?: string | null
          statement_id?: string
          status?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_entries_matched_expense_id_fkey"
            columns: ["matched_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_entries_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_entries_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statements: {
        Row: {
          bank_name: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          period_end: string | null
          period_start: string | null
          uploaded_by: string | null
        }
        Insert: {
          bank_name: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          uploaded_by?: string | null
        }
        Update: {
          bank_name?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      banks: {
        Row: {
          codigo: string
          created_at: string
          id: string
          is_active: boolean
          nome: string
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          is_active?: boolean
          nome: string
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          is_active?: boolean
          nome?: string
        }
        Relationships: []
      }
      billing_contacts: {
        Row: {
          account_id: string
          centro_custo: string | null
          cpf_cnpj: string
          created_at: string
          created_by: string | null
          email_nf: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          is_active: boolean
          nome_caso_projeto: string | null
          razao_social: string
          tipo_documento: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          centro_custo?: string | null
          cpf_cnpj: string
          created_at?: string
          created_by?: string | null
          email_nf?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean
          nome_caso_projeto?: string | null
          razao_social: string
          tipo_documento?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          centro_custo?: string | null
          cpf_cnpj?: string
          created_at?: string
          created_by?: string | null
          email_nf?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean
          nome_caso_projeto?: string | null
          razao_social?: string
          tipo_documento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      boletos: {
        Row: {
          amount: number
          barcode: string | null
          billing_contact_id: string | null
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          notes: string | null
          our_number: string | null
          paid_at: string | null
          pdf_url: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          barcode?: string | null
          billing_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          notes?: string | null
          our_number?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          barcode?: string | null
          billing_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          our_number?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletos_billing_contact_id_fkey"
            columns: ["billing_contact_id"]
            isOneToOne: false
            referencedRelation: "billing_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_calculations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          area: Database["public"]["Enums"]["area_setor"]
          billed_at: string | null
          billed_by: string | null
          bonus_amount: number
          created_at: string
          excess_count: number
          extra_value: number
          id: string
          is_billed: boolean
          monthly_goal: number
          notes: string | null
          payment_month: string
          reference_month: string
          status: Database["public"]["Enums"]["bonus_status"]
          total_weighted: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          area: Database["public"]["Enums"]["area_setor"]
          billed_at?: string | null
          billed_by?: string | null
          bonus_amount?: number
          created_at?: string
          excess_count?: number
          extra_value?: number
          id?: string
          is_billed?: boolean
          monthly_goal?: number
          notes?: string | null
          payment_month: string
          reference_month: string
          status?: Database["public"]["Enums"]["bonus_status"]
          total_weighted?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          area?: Database["public"]["Enums"]["area_setor"]
          billed_at?: string | null
          billed_by?: string | null
          bonus_amount?: number
          created_at?: string
          excess_count?: number
          extra_value?: number
          id?: string
          is_billed?: boolean
          monthly_goal?: number
          notes?: string | null
          payment_month?: string
          reference_month?: string
          status?: Database["public"]["Enums"]["bonus_status"]
          total_weighted?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
        }
        Relationships: []
      }
      calculation_types: {
        Row: {
          created_at: string
          estimated_complexity: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          estimated_complexity?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          estimated_complexity?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          created_at: string | null
          description: string | null
          end_at: string
          event_type: Database["public"]["Enums"]["event_type"] | null
          google_event_id: string | null
          id: string
          location: string | null
          process_deadline_id: string | null
          start_at: string
          sync_to_google: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string | null
          description?: string | null
          end_at: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          process_deadline_id?: string | null
          start_at: string
          sync_to_google?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          created_at?: string | null
          description?: string | null
          end_at?: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          process_deadline_id?: string | null
          start_at?: string
          sync_to_google?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_process_deadline_id_fkey"
            columns: ["process_deadline_id"]
            isOneToOne: false
            referencedRelation: "process_deadlines"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          active: boolean | null
          code: string
          created_at: string
          id: string
          level: number | null
          name: string
          parent_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string
          id?: string
          level?: number | null
          name: string
          parent_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string
          id?: string
          level?: number | null
          name?: string
          parent_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_aliases: {
        Row: {
          alias: string
          client_id: string
          created_at: string | null
          created_by: string | null
          id: string
        }
        Insert: {
          alias: string
          client_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
        }
        Update: {
          alias?: string
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_aliases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_branches: {
        Row: {
          branch_id: string
          client_id: string
        }
        Insert: {
          branch_id: string
          client_id: string
        }
        Update: {
          branch_id?: string
          client_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_branches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          cargo: string | null
          celular: string | null
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          nome: string
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          celular?: string | null
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
          telefone?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          celular?: string | null
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sla_rules: {
        Row: {
          calculation_type: string | null
          client_id: string
          created_at: string
          deadline_hours: number
          description: string | null
          id: string
        }
        Insert: {
          calculation_type?: string | null
          client_id: string
          created_at?: string
          deadline_hours: number
          description?: string | null
          id?: string
        }
        Update: {
          calculation_type?: string | null
          client_id?: string
          created_at?: string
          deadline_hours?: number
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_sla_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          aplicar_grossup: boolean | null
          bairro: string | null
          billing_reminder_days: number | null
          billing_reminder_enabled: boolean | null
          canal_importacao: string | null
          centro_custo: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          contract_key_id: string | null
          contrato_condicoes_faturamento: string | null
          contrato_data_inicio: string | null
          contrato_data_vencimento: string | null
          contrato_objeto: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          dados_bancarios_agencia: string | null
          dados_bancarios_banco: string | null
          dados_bancarios_conta: string | null
          data_nascimento: string | null
          dia_emissao_nf: number | null
          dia_vencimento: number | null
          economic_group_id: string | null
          estado: string | null
          id: string
          indicacao_agencia: string | null
          indicacao_banco: string | null
          indicacao_conta_corrente: string | null
          indicacao_email: string | null
          indicacao_por: string | null
          indicacao_responsavel: string | null
          indicacao_tipo: string | null
          indicacao_valor: number | null
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          is_active: boolean | null
          logradouro: string | null
          metodo_pagamento: string | null
          nome: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          pix_chave: string | null
          razao_social: string | null
          representante_legal: string | null
          rg: string | null
          tipo: Database["public"]["Enums"]["pessoa_tipo"]
          tipo_cadastro: Database["public"]["Enums"]["tipo_cadastro"]
          tipo_grossup: string | null
          updated_at: string
        }
        Insert: {
          aplicar_grossup?: boolean | null
          bairro?: string | null
          billing_reminder_days?: number | null
          billing_reminder_enabled?: boolean | null
          canal_importacao?: string | null
          centro_custo?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          contract_key_id?: string | null
          contrato_condicoes_faturamento?: string | null
          contrato_data_inicio?: string | null
          contrato_data_vencimento?: string | null
          contrato_objeto?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          dados_bancarios_agencia?: string | null
          dados_bancarios_banco?: string | null
          dados_bancarios_conta?: string | null
          data_nascimento?: string | null
          dia_emissao_nf?: number | null
          dia_vencimento?: number | null
          economic_group_id?: string | null
          estado?: string | null
          id?: string
          indicacao_agencia?: string | null
          indicacao_banco?: string | null
          indicacao_conta_corrente?: string | null
          indicacao_email?: string | null
          indicacao_por?: string | null
          indicacao_responsavel?: string | null
          indicacao_tipo?: string | null
          indicacao_valor?: number | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean | null
          logradouro?: string | null
          metodo_pagamento?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pix_chave?: string | null
          razao_social?: string | null
          representante_legal?: string | null
          rg?: string | null
          tipo: Database["public"]["Enums"]["pessoa_tipo"]
          tipo_cadastro?: Database["public"]["Enums"]["tipo_cadastro"]
          tipo_grossup?: string | null
          updated_at?: string
        }
        Update: {
          aplicar_grossup?: boolean | null
          bairro?: string | null
          billing_reminder_days?: number | null
          billing_reminder_enabled?: boolean | null
          canal_importacao?: string | null
          centro_custo?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          contract_key_id?: string | null
          contrato_condicoes_faturamento?: string | null
          contrato_data_inicio?: string | null
          contrato_data_vencimento?: string | null
          contrato_objeto?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          dados_bancarios_agencia?: string | null
          dados_bancarios_banco?: string | null
          dados_bancarios_conta?: string | null
          data_nascimento?: string | null
          dia_emissao_nf?: number | null
          dia_vencimento?: number | null
          economic_group_id?: string | null
          estado?: string | null
          id?: string
          indicacao_agencia?: string | null
          indicacao_banco?: string | null
          indicacao_conta_corrente?: string | null
          indicacao_email?: string | null
          indicacao_por?: string | null
          indicacao_responsavel?: string | null
          indicacao_tipo?: string | null
          indicacao_valor?: number | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean | null
          logradouro?: string | null
          metodo_pagamento?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pix_chave?: string | null
          razao_social?: string | null
          representante_legal?: string | null
          rg?: string | null
          tipo?: Database["public"]["Enums"]["pessoa_tipo"]
          tipo_cadastro?: Database["public"]["Enums"]["tipo_cadastro"]
          tipo_grossup?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_contract_key_id_fkey"
            columns: ["contract_key_id"]
            isOneToOne: false
            referencedRelation: "contract_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_economic_group_id_fkey"
            columns: ["economic_group_id"]
            isOneToOne: false
            referencedRelation: "economic_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      company_entities: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          is_active: boolean | null
          nome_fantasia: string | null
          razao_social: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          nome_fantasia?: string | null
          razao_social: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          nome_fantasia?: string | null
          razao_social?: string
        }
        Relationships: []
      }
      contract_extractions: {
        Row: {
          client_id: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          document_id: string | null
          error_message: string | null
          extracted_data: Json | null
          file_url: string
          id: string
          missing_fields: string[] | null
          processed_at: string | null
          status: Database["public"]["Enums"]["extraction_status"]
        }
        Insert: {
          client_id?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_url: string
          id?: string
          missing_fields?: string[] | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["extraction_status"]
        }
        Update: {
          client_id?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_url?: string
          id?: string
          missing_fields?: string[] | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["extraction_status"]
        }
        Relationships: [
          {
            foreignKeyName: "contract_extractions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "client_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_keys: {
        Row: {
          created_at: string | null
          descricao: string | null
          economic_group_id: string | null
          id: string
          is_active: boolean | null
          nome: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          economic_group_id?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          economic_group_id?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_keys_economic_group_id_fkey"
            columns: ["economic_group_id"]
            isOneToOne: false
            referencedRelation: "economic_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_pricing: {
        Row: {
          cap_horas: number | null
          cap_valor: number | null
          client_id: string | null
          cliente_nome: string
          cod_cliente: number | null
          cod_contrato: number | null
          contrato: string
          created_at: string | null
          data_reajuste: string | null
          id: string
          is_active: boolean | null
          modalidade: string | null
          moeda: string | null
          monitoramento: string | null
          percentual: number | null
          proc_andamento: number | null
          proc_encerrado: number | null
          tipo_calculo: string
          tipo_valor: string | null
          updated_at: string | null
          valor: number | null
        }
        Insert: {
          cap_horas?: number | null
          cap_valor?: number | null
          client_id?: string | null
          cliente_nome: string
          cod_cliente?: number | null
          cod_contrato?: number | null
          contrato: string
          created_at?: string | null
          data_reajuste?: string | null
          id?: string
          is_active?: boolean | null
          modalidade?: string | null
          moeda?: string | null
          monitoramento?: string | null
          percentual?: number | null
          proc_andamento?: number | null
          proc_encerrado?: number | null
          tipo_calculo: string
          tipo_valor?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Update: {
          cap_horas?: number | null
          cap_valor?: number | null
          client_id?: string | null
          cliente_nome?: string
          cod_cliente?: number | null
          cod_contrato?: number | null
          contrato?: string
          created_at?: string | null
          data_reajuste?: string | null
          id?: string
          is_active?: boolean | null
          modalidade?: string | null
          moeda?: string | null
          monitoramento?: string | null
          percentual?: number | null
          proc_andamento?: number | null
          proc_encerrado?: number | null
          tipo_calculo?: string
          tipo_valor?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_pricing_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          label: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          label: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          label?: string
          name?: string
        }
        Relationships: []
      }
      economic_groups: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          is_active: boolean | null
          nome: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
        }
        Relationships: []
      }
      expense_splits: {
        Row: {
          centro_custo: string
          created_at: string | null
          expense_id: string
          id: string
          percentual: number
          valor: number
        }
        Insert: {
          centro_custo: string
          created_at?: string | null
          expense_id: string
          id?: string
          percentual: number
          valor: number
        }
        Update: {
          centro_custo?: string
          created_at?: string | null
          expense_id?: string
          id?: string
          percentual?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_id: string | null
          aprovado_em: string | null
          aprovado_por: string | null
          branch_id: string | null
          categoria: string
          centro_custo: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          fornecedor: string | null
          id: string
          numero_documento: string | null
          observacoes: string | null
          status: string
          status_aprovacao: string
          updated_at: string
          valor: number
        }
        Insert: {
          account_id?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          branch_id?: string | null
          categoria?: string
          centro_custo?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          fornecedor?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          status?: string
          status_aprovacao?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          account_id?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          branch_id?: string | null
          categoria?: string
          centro_custo?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          fornecedor?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          status?: string
          status_aprovacao?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_groups: {
        Row: {
          centros_custo: string[] | null
          created_at: string | null
          descricao: string | null
          id: string
          is_active: boolean | null
          nome: string
        }
        Insert: {
          centros_custo?: string[] | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
        }
        Update: {
          centros_custo?: string[] | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
        }
        Relationships: []
      }
      historico_axis: {
        Row: {
          cliente: string | null
          codigo_cliente: string | null
          codigo_contrato: string | null
          codigo_externo: string | null
          contrato: string | null
          corte: string | null
          descritivo: string | null
          equipe: string | null
          fechamento: string | null
          filial: string | null
          id: string | null
          lancamento: string | null
          numero_processo: string | null
          observacao: string | null
          papel_parte_contraria: string | null
          papel_parte_principal: string | null
          parte_contraria: string | null
          parte_principal: string | null
          peso: string | null
          profissional: string | null
          status_lancamento: string | null
          tipo_atividade: string | null
        }
        Insert: {
          cliente?: string | null
          codigo_cliente?: string | null
          codigo_contrato?: string | null
          codigo_externo?: string | null
          contrato?: string | null
          corte?: string | null
          descritivo?: string | null
          equipe?: string | null
          fechamento?: string | null
          filial?: string | null
          id?: string | null
          lancamento?: string | null
          numero_processo?: string | null
          observacao?: string | null
          papel_parte_contraria?: string | null
          papel_parte_principal?: string | null
          parte_contraria?: string | null
          parte_principal?: string | null
          peso?: string | null
          profissional?: string | null
          status_lancamento?: string | null
          tipo_atividade?: string | null
        }
        Update: {
          cliente?: string | null
          codigo_cliente?: string | null
          codigo_contrato?: string | null
          codigo_externo?: string | null
          contrato?: string | null
          corte?: string | null
          descritivo?: string | null
          equipe?: string | null
          fechamento?: string | null
          filial?: string | null
          id?: string | null
          lancamento?: string | null
          numero_processo?: string | null
          observacao?: string | null
          papel_parte_contraria?: string | null
          papel_parte_principal?: string | null
          parte_contraria?: string | null
          parte_principal?: string | null
          peso?: string | null
          profissional?: string | null
          status_lancamento?: string | null
          tipo_atividade?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          account_id: string
          billing_contact_id: string
          branch_id: string | null
          centro_custo: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string
          nfe_pdf_url: string | null
          nfe_protocol: string | null
          nfe_status: string | null
          nfe_xml_url: string | null
          numero_nf: string | null
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          account_id: string
          billing_contact_id: string
          branch_id?: string | null
          centro_custo?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          nfe_pdf_url?: string | null
          nfe_protocol?: string | null
          nfe_status?: string | null
          nfe_xml_url?: string | null
          numero_nf?: string | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          account_id?: string
          billing_contact_id?: string
          branch_id?: string | null
          centro_custo?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          nfe_pdf_url?: string | null
          nfe_protocol?: string | null
          nfe_status?: string | null
          nfe_xml_url?: string | null
          numero_nf?: string | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_billing_contact_id_fkey"
            columns: ["billing_contact_id"]
            isOneToOne: false
            referencedRelation: "billing_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_emails: {
        Row: {
          branch_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          label: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          label?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitored_emails_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_config: {
        Row: {
          aliquota_iss: number
          cnpj: string
          codigo_servico: string
          created_at: string
          email_contato: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          id: string
          inscricao_municipal: string
          is_active: boolean
          provider: string
          provider_api_url: string | null
          razao_social: string
          regime_tributario: string
          updated_at: string
        }
        Insert: {
          aliquota_iss?: number
          cnpj: string
          codigo_servico?: string
          created_at?: string
          email_contato?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          id?: string
          inscricao_municipal: string
          is_active?: boolean
          provider?: string
          provider_api_url?: string | null
          razao_social: string
          regime_tributario?: string
          updated_at?: string
        }
        Update: {
          aliquota_iss?: number
          cnpj?: string
          codigo_servico?: string
          created_at?: string
          email_contato?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          id?: string
          inscricao_municipal?: string
          is_active?: boolean
          provider?: string
          provider_api_url?: string | null
          razao_social?: string
          regime_tributario?: string
          updated_at?: string
        }
        Relationships: []
      }
      pautas_unificadas: {
        Row: {
          cliente_marquesi: string
          created_at: string
          data_registro_cliente: string | null
          id: string
          id_tarefa_cliente: string | null
          json_original: Json | null
          motivo_calculo: string | null
          numero_processo: string
          observacao_calculo: string | null
          parte_contraria: string | null
          resultado_decisao: string | null
          status_processamento: string | null
          tipo_decisao: string | null
          tipo_servico: string | null
          updated_at: string
        }
        Insert: {
          cliente_marquesi: string
          created_at?: string
          data_registro_cliente?: string | null
          id?: string
          id_tarefa_cliente?: string | null
          json_original?: Json | null
          motivo_calculo?: string | null
          numero_processo: string
          observacao_calculo?: string | null
          parte_contraria?: string | null
          resultado_decisao?: string | null
          status_processamento?: string | null
          tipo_decisao?: string | null
          tipo_servico?: string | null
          updated_at?: string
        }
        Update: {
          cliente_marquesi?: string
          created_at?: string
          data_registro_cliente?: string | null
          id?: string
          id_tarefa_cliente?: string | null
          json_original?: Json | null
          motivo_calculo?: string | null
          numero_processo?: string
          observacao_calculo?: string | null
          parte_contraria?: string | null
          resultado_decisao?: string | null
          status_processamento?: string | null
          tipo_decisao?: string | null
          tipo_servico?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          module: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      phase_area_mapping: {
        Row: {
          area_setor: string
          created_at: string | null
          fase_keyword: string
          id: string
        }
        Insert: {
          area_setor: string
          created_at?: string | null
          fase_keyword: string
          id?: string
        }
        Update: {
          area_setor?: string
          created_at?: string | null
          fase_keyword?: string
          id?: string
        }
        Relationships: []
      }
      process_deadlines: {
        Row: {
          assigned_to: string | null
          calendar_event_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          data_prazo: string
          detalhes: string | null
          document_url: string | null
          external_id: string | null
          id: string
          id_tarefa_externa: string | null
          is_completed: boolean | null
          ocorrencia: string
          process_id: string
          realizado_por: string | null
          requires_attachment: boolean | null
          solicitacao_id: string | null
          source: string | null
          timesheet_entry_id: string | null
          ultimo_andamento: string | null
          updated_at: string
          urgente: boolean | null
        }
        Insert: {
          assigned_to?: string | null
          calendar_event_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          data_prazo: string
          detalhes?: string | null
          document_url?: string | null
          external_id?: string | null
          id?: string
          id_tarefa_externa?: string | null
          is_completed?: boolean | null
          ocorrencia: string
          process_id: string
          realizado_por?: string | null
          requires_attachment?: boolean | null
          solicitacao_id?: string | null
          source?: string | null
          timesheet_entry_id?: string | null
          ultimo_andamento?: string | null
          updated_at?: string
          urgente?: boolean | null
        }
        Update: {
          assigned_to?: string | null
          calendar_event_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          data_prazo?: string
          detalhes?: string | null
          document_url?: string | null
          external_id?: string | null
          id?: string
          id_tarefa_externa?: string | null
          is_completed?: boolean | null
          ocorrencia?: string
          process_id?: string
          realizado_por?: string | null
          requires_attachment?: boolean | null
          solicitacao_id?: string | null
          source?: string | null
          timesheet_entry_id?: string | null
          ultimo_andamento?: string | null
          updated_at?: string
          urgente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "process_deadlines_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_deadlines_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_files: {
        Row: {
          client_id: string | null
          created_at: string
          drive_file_id: string
          error_message: string | null
          extraction_id: string | null
          file_created_at: string | null
          file_name: string
          file_size: number | null
          folder_id: string | null
          id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["processed_file_status"]
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          drive_file_id: string
          error_message?: string | null
          extraction_id?: string | null
          file_created_at?: string | null
          file_name: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["processed_file_status"]
        }
        Update: {
          client_id?: string | null
          created_at?: string
          drive_file_id?: string
          error_message?: string | null
          extraction_id?: string | null
          file_created_at?: string | null
          file_name?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["processed_file_status"]
        }
        Relationships: [
          {
            foreignKeyName: "processed_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_files_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "contract_extractions"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          area: Database["public"]["Enums"]["area_processo"]
          codigo_externo: string | null
          created_at: string
          created_by: string | null
          data_processo: string | null
          drive_folder_id: string | null
          id: string
          id_cliente: string
          numero_pasta: number
          numero_processo: string
          reclamadas: string[] | null
          reclamante_cpf: string | null
          reclamante_nascimento: string | null
          reclamante_nome: string
          tipo_acao: Database["public"]["Enums"]["tipo_acao"]
          updated_at: string
        }
        Insert: {
          area?: Database["public"]["Enums"]["area_processo"]
          codigo_externo?: string | null
          created_at?: string
          created_by?: string | null
          data_processo?: string | null
          drive_folder_id?: string | null
          id?: string
          id_cliente: string
          numero_pasta?: number
          numero_processo: string
          reclamadas?: string[] | null
          reclamante_cpf?: string | null
          reclamante_nascimento?: string | null
          reclamante_nome: string
          tipo_acao: Database["public"]["Enums"]["tipo_acao"]
          updated_at?: string
        }
        Update: {
          area?: Database["public"]["Enums"]["area_processo"]
          codigo_externo?: string | null
          created_at?: string
          created_by?: string | null
          data_processo?: string | null
          drive_folder_id?: string | null
          id?: string
          id_cliente?: string
          numero_pasta?: number
          numero_processo?: string
          reclamadas?: string[] | null
          reclamante_cpf?: string | null
          reclamante_nascimento?: string | null
          reclamante_nome?: string
          tipo_acao?: Database["public"]["Enums"]["tipo_acao"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_logs: {
        Row: {
          created_at: string
          emails_found: number
          emails_processed: number
          errors: Json | null
          finished_at: string | null
          id: string
          source: string
          started_at: string
        }
        Insert: {
          created_at?: string
          emails_found?: number
          emails_processed?: number
          errors?: Json | null
          finished_at?: string | null
          id?: string
          source?: string
          started_at?: string
        }
        Update: {
          created_at?: string
          emails_found?: number
          emails_processed?: number
          errors?: Json | null
          finished_at?: string | null
          id?: string
          source?: string
          started_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agencia: string | null
          area: Database["public"]["Enums"]["area_setor"] | null
          avatar_url: string | null
          banco: string | null
          branch_id: string | null
          conta: string | null
          conta_digito: string | null
          cpf: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          pix_key: string | null
          reports_to: string | null
          sigla: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agencia?: string | null
          area?: Database["public"]["Enums"]["area_setor"] | null
          avatar_url?: string | null
          banco?: string | null
          branch_id?: string | null
          conta?: string | null
          conta_digito?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          pix_key?: string | null
          reports_to?: string | null
          sigla?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agencia?: string | null
          area?: Database["public"]["Enums"]["area_setor"] | null
          avatar_url?: string | null
          banco?: string | null
          branch_id?: string | null
          conta?: string | null
          conta_digito?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          pix_key?: string | null
          reports_to?: string | null
          sigla?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      related_processes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          numero_processo_relacionado: string
          observacoes: string | null
          process_id: string
          tipo_relacao: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          numero_processo_relacionado: string
          observacoes?: string | null
          process_id: string
          tipo_relacao?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          numero_processo_relacionado?: string
          observacoes?: string | null
          process_id?: string
          tipo_relacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_related_process"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: string
          scope: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: string
          scope?: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          ai_confidence: number | null
          area: Database["public"]["Enums"]["area_processo"]
          assigned_to: string | null
          calculation_type_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          data_limite: string | null
          descricao: string | null
          email_date: string | null
          email_from: string | null
          email_id: string | null
          email_snippet: string | null
          email_subject: string | null
          extracted_details: Json | null
          id: string
          id_tarefa_externa: string | null
          origem: Database["public"]["Enums"]["origem_solicitacao"]
          prioridade: Database["public"]["Enums"]["prioridade_solicitacao"]
          process_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["status_solicitacao"]
          titulo: string
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          area?: Database["public"]["Enums"]["area_processo"]
          assigned_to?: string | null
          calculation_type_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          data_limite?: string | null
          descricao?: string | null
          email_date?: string | null
          email_from?: string | null
          email_id?: string | null
          email_snippet?: string | null
          email_subject?: string | null
          extracted_details?: Json | null
          id?: string
          id_tarefa_externa?: string | null
          origem?: Database["public"]["Enums"]["origem_solicitacao"]
          prioridade?: Database["public"]["Enums"]["prioridade_solicitacao"]
          process_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao"]
          titulo: string
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          area?: Database["public"]["Enums"]["area_processo"]
          assigned_to?: string | null
          calculation_type_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          data_limite?: string | null
          descricao?: string | null
          email_date?: string | null
          email_from?: string | null
          email_id?: string | null
          email_snippet?: string | null
          email_subject?: string | null
          extracted_details?: Json | null
          id?: string
          id_tarefa_externa?: string | null
          origem?: Database["public"]["Enums"]["origem_solicitacao"]
          prioridade?: Database["public"]["Enums"]["prioridade_solicitacao"]
          process_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_calculation_type_id_fkey"
            columns: ["calculation_type_id"]
            isOneToOne: false
            referencedRelation: "calculation_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string
          details: Json | null
          error_message: string | null
          finished_at: string | null
          id: string
          rows_failed: number | null
          rows_found: number | null
          rows_processed: number | null
          sheet_type: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          rows_failed?: number | null
          rows_found?: number | null
          rows_processed?: number | null
          sheet_type: string
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          rows_failed?: number | null
          rows_found?: number | null
          rows_processed?: number | null
          sheet_type?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      tax_rules: {
        Row: {
          aliquot_percentage: number
          created_at: string
          id: string
          is_active: boolean | null
          max_revenue: number | null
          min_revenue: number | null
          name: string
          regime: string
          updated_at: string
        }
        Insert: {
          aliquot_percentage?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_revenue?: number | null
          min_revenue?: number | null
          name: string
          regime: string
          updated_at?: string
        }
        Update: {
          aliquot_percentage?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_revenue?: number | null
          min_revenue?: number | null
          name?: string
          regime?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_clients: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          team_lead_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          team_lead_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          team_lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_clients_team_lead_id_fkey"
            columns: ["team_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_clients_team_lead_id_fkey"
            columns: ["team_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_entries: {
        Row: {
          activity_type_id: string | null
          client_id: string | null
          codigo_externo: string | null
          created_at: string
          data_atividade: string
          deadline_id: string | null
          descricao: string
          drive_folder_url: string | null
          external_id: string | null
          id: string
          observacao: string | null
          process_id: string | null
          quantidade: number
          reclamante_nome: string | null
          source: string | null
          status_faturamento: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type_id?: string | null
          client_id?: string | null
          codigo_externo?: string | null
          created_at?: string
          data_atividade: string
          deadline_id?: string | null
          descricao: string
          drive_folder_url?: string | null
          external_id?: string | null
          id?: string
          observacao?: string | null
          process_id?: string | null
          quantidade?: number
          reclamante_nome?: string | null
          source?: string | null
          status_faturamento?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type_id?: string | null
          client_id?: string | null
          codigo_externo?: string | null
          created_at?: string
          data_atividade?: string
          deadline_id?: string | null
          descricao?: string
          drive_folder_url?: string | null
          external_id?: string | null
          id?: string
          observacao?: string | null
          process_id?: string | null
          quantidade?: number
          reclamante_nome?: string | null
          source?: string | null
          status_faturamento?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_entries: {
        Row: {
          bank_account_id: string
          conta_destino_id: string | null
          created_at: string
          created_by: string | null
          data_movimentacao: string
          descricao: string | null
          id: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          bank_account_id: string
          conta_destino_id?: string | null
          created_at?: string
          created_by?: string | null
          data_movimentacao: string
          descricao?: string | null
          id?: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          bank_account_id?: string
          conta_destino_id?: string | null
          created_at?: string
          created_by?: string | null
          data_movimentacao?: string
          descricao?: string | null
          id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "treasury_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_entries_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts_config"
            referencedColumns: ["id"]
          },
        ]
      }
      user_aliases: {
        Row: {
          alias: string
          created_at: string
          created_by: string | null
          id: string
          is_old_user: boolean
          user_id: string
        }
        Insert: {
          alias: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_old_user?: boolean
          user_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_old_user?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission_id: string
          scope: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_id: string
          scope?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_id?: string
          scope?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_safe: {
        Row: {
          area: Database["public"]["Enums"]["area_setor"] | null
          email: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          reports_to: string | null
          sigla: string | null
          user_id: string | null
        }
        Insert: {
          area?: Database["public"]["Enums"]["area_setor"] | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          reports_to?: string | null
          sigla?: string | null
          user_id?: string | null
        }
        Update: {
          area?: Database["public"]["Enums"]["area_setor"] | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          reports_to?: string | null
          sigla?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_calculation: {
        Args: { p_solicitacao_id: string }
        Returns: string
      }
      calculate_monthly_bonus: { Args: { p_month: string }; Returns: number }
      create_timesheet_unique_index: { Args: never; Returns: string }
      delete_timesheet_duplicates_batch: {
        Args: { p_batch_size?: number }
        Returns: number
      }
      delete_timesheet_duplicates_v2: {
        Args: { p_batch_size?: number }
        Returns: number
      }
      get_all_deadlines_with_details: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_team_user_ids?: string[]
          p_user_id?: string
        }
        Returns: {
          area: string
          assigned_to: string
          assigned_user_name: string
          completed_by: string
          completed_by_name: string
          data_prazo: string
          detalhes: string
          id: string
          is_completed: boolean
          numero_pasta: number
          numero_processo: string
          ocorrencia: string
          process_id: string
          reclamadas: string[]
          reclamante_nome: string
          solicitacao_id: string
          solicitacao_prioridade: string
          solicitacao_titulo: string
          ultimo_andamento: string
        }[]
      }
      get_coordinator_for_client: {
        Args: { p_client_id: string }
        Returns: string
      }
      get_goal_progress_data: {
        Args: {
          p_month_end: string
          p_month_start: string
          p_user_ids: string[]
        }
        Returns: {
          total_weighted: number
          user_id: string
        }[]
      }
      get_permission_scope: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: string
      }
      get_prazos_abertos_report: {
        Args: never
        Returns: {
          area: string
          cliente: string
          data_prazo: string
          id: string
          numero_pasta: string
          ocorrencia: string
          processo: string
          reclamadas: string
          reclamante: string
          responsavel: string
          source: string
        }[]
      }
      get_prazos_rows: {
        Args: {
          p_month: string
          p_page?: number
          p_page_size?: number
          p_responsavel_id?: string
          p_search?: string
          p_status?: string[]
        }
        Returns: Json
      }
      get_prazos_summary: {
        Args: { p_month: string; p_responsavel_id?: string }
        Returns: Json
      }
      get_process_counts_by_client: {
        Args: never
        Returns: {
          client_id: string
          process_count: number
        }[]
      }
      get_producao_aggregated: {
        Args: {
          p_dimension: string
          p_end: string
          p_is_admin: boolean
          p_start: string
          p_user_id: string
        }
        Returns: {
          label: string
          lancamentos: number
          pontos: number
        }[]
      }
      get_profile_id_for_user: { Args: { _user_id: string }; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_coordinator_or_above: { Args: { _user_id: string }; Returns: boolean }
      is_financeiro: { Args: { _user_id: string }; Returns: boolean }
      is_leader_or_above: { Args: { _user_id: string }; Returns: boolean }
      reconcile_open_deadlines:
        | { Args: never; Returns: Json }
        | { Args: { p_batch_size?: number }; Returns: Json }
      relink_orphan_timesheet_entries:
        | { Args: never; Returns: Json }
        | { Args: { p_batch_size?: number }; Returns: Json }
      reports_to_user: {
        Args: { _manager_profile_id: string; _target_user_id: string }
        Returns: boolean
      }
      smart_assign_deadline: {
        Args: { p_deadline_id: string }
        Returns: {
          assigned_user_id: string
          is_coordinator: boolean
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      agent_execution_status: "running" | "completed" | "failed"
      app_role:
        | "admin"
        | "gerente"
        | "lider"
        | "calculista"
        | "financeiro"
        | "socio"
        | "coordenador"
        | "usuario"
        | "advogado"
        | "assistente"
        | "consultor"
        | "assistente_financeiro"
      area_processo: "trabalhista" | "civel"
      area_setor:
        | "execucao"
        | "contingencia"
        | "decisao"
        | "acoes_coletivas"
        | "administrativo"
        | "rh"
        | "financeiro_area"
        | "geral"
        | "agendamento"
        | "civel"
        | "digitacao"
        | "laudos"
      bonus_status: "pending" | "approved" | "paid" | "cancelled"
      event_type: "prazo" | "reuniao" | "audiencia" | "lembrete" | "outro"
      extraction_status: "pending" | "processing" | "completed" | "failed"
      origem_solicitacao:
        | "email"
        | "api"
        | "manual"
        | "email_sheet"
        | "planilha_5_clientes"
        | "planilha_pautas"
      pessoa_tipo: "fisica" | "juridica"
      prioridade_solicitacao: "baixa" | "media" | "alta" | "urgente"
      processed_file_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "skipped"
      status_solicitacao:
        | "pendente"
        | "em_andamento"
        | "concluida"
        | "cancelada"
      tipo_acao: "individual" | "coletiva"
      tipo_cadastro: "cliente" | "fornecedor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_execution_status: ["running", "completed", "failed"],
      app_role: [
        "admin",
        "gerente",
        "lider",
        "calculista",
        "financeiro",
        "socio",
        "coordenador",
        "usuario",
        "advogado",
        "assistente",
        "consultor",
        "assistente_financeiro",
      ],
      area_processo: ["trabalhista", "civel"],
      area_setor: [
        "execucao",
        "contingencia",
        "decisao",
        "acoes_coletivas",
        "administrativo",
        "rh",
        "financeiro_area",
        "geral",
        "agendamento",
        "civel",
        "digitacao",
        "laudos",
      ],
      bonus_status: ["pending", "approved", "paid", "cancelled"],
      event_type: ["prazo", "reuniao", "audiencia", "lembrete", "outro"],
      extraction_status: ["pending", "processing", "completed", "failed"],
      origem_solicitacao: [
        "email",
        "api",
        "manual",
        "email_sheet",
        "planilha_5_clientes",
        "planilha_pautas",
      ],
      pessoa_tipo: ["fisica", "juridica"],
      prioridade_solicitacao: ["baixa", "media", "alta", "urgente"],
      processed_file_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "skipped",
      ],
      status_solicitacao: [
        "pendente",
        "em_andamento",
        "concluida",
        "cancelada",
      ],
      tipo_acao: ["individual", "coletiva"],
      tipo_cadastro: ["cliente", "fornecedor"],
    },
  },
} as const

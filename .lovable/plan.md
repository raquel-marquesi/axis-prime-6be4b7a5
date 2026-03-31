

## Varredura de UX: Fontes, Estilos e Cores — Diagnóstico e Melhorias

### Diagnóstico Atual

**Fontes**: Nenhuma fonte customizada é importada. O sistema usa a fonte padrão do navegador (system-ui/sans-serif do Tailwind). Para uma consultoria jurídica, isso passa uma impressão genérica.

**Cores**: O design system usa HSL com duas cores principais:
- **Primary** (dourado): `hsl(31, 24%, 60%)` — tom amarronzado/dourado apagado
- **Foreground** (azul escuro): `hsl(213, 38%, 15%)` — bom contraste
- O primary tem **baixo contraste** contra fundo branco (ratio ~3.5:1), abaixo do recomendável WCAG AA para texto

**Inconsistências visuais encontradas**:
- Títulos de página variam entre `text-2xl` (Dashboard, Processos, Clientes) e `text-3xl` (Financeiro, Solicitações, Configurações, Equipes)
- Algumas páginas têm `p-6` interno (Configurações, Equipes) enquanto o `MainLayout` já aplica `p-6`, causando **padding duplo**
- Subtítulos variam entre `text-sm text-muted-foreground` e `text-muted-foreground` (sem `text-sm`)
- Animações de entrada (`animate-in fade-in`) aplicadas inconsistentemente (algumas páginas sim, outras não)
- O `App.css` contém estilos legados do template Vite (logo spin, `.card`, `.read-the-docs`) que não são usados

### Plano de Melhorias

#### 1. Adicionar fonte profissional (Inter)
- Importar **Inter** do Google Fonts no `index.html`
- Configurar `fontFamily` no `tailwind.config.ts` como `sans: ['Inter', ...defaultTheme.fontFamily.sans]`
- Resultado: tipografia mais limpa e profissional

#### 2. Ajustar contraste do primary
- Escurecer levemente o primary de `31 24% 60%` para `31 30% 48%` — melhor legibilidade mantendo a identidade dourada
- Ajustar `--accent` proporcionalmente

#### 3. Padronizar hierarquia de títulos em todas as páginas
- Todos os títulos de página: `text-2xl font-bold tracking-tight text-foreground`
- Todos os subtítulos: `text-sm text-muted-foreground`
- Páginas afetadas: `Financeiro.tsx`, `Solicitacoes.tsx`, `Configuracoes.tsx`, `Equipes.tsx`, `ImportarPautas.tsx`

#### 4. Remover padding duplo
- Remover `p-6` interno de `Configuracoes.tsx` e `Equipes.tsx` (já vem do `MainLayout`)

#### 5. Aplicar animação de entrada consistente
- Adicionar `animate-in fade-in duration-500` ao wrapper principal de todas as páginas que não o possuem

#### 6. Limpar App.css legado
- Remover todo o conteúdo de `src/App.css` (estilos do template Vite não utilizados)

#### 7. Melhorar cards de KPI (micro-interação)
- Adicionar `hover:shadow-md transition-shadow` aos cards de métricas para feedback visual

### Arquivos editados
| Arquivo | Alteração |
|---------|-----------|
| `index.html` | Import da fonte Inter |
| `tailwind.config.ts` | fontFamily + hover shadow |
| `src/index.css` | Ajuste primary contrast |
| `src/App.css` | Limpar conteúdo legado |
| `src/pages/Financeiro.tsx` | Padronizar título |
| `src/pages/Configuracoes.tsx` | Padronizar título + remover p-6 |
| `src/pages/Equipes.tsx` | Padronizar título + remover p-6 |
| `src/pages/ImportarPautas.tsx` | Padronizar título + remover p-6 |
| `src/pages/Solicitacoes.tsx` | Padronizar título |
| `src/pages/Processes.tsx` | Adicionar animação |
| `src/pages/Dashboard.tsx` | Adicionar animação |


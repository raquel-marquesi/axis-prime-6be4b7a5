
O erro do build está no workflow `.github/workflows/supabase.yml`. Olhando o diff que vazou:

```yaml
20260414190000 20260414193000 20260414200000; do
   supabase migration repair --status reverted 20260402155704 20260415115251 20260415120819 20260415194102 20260416130544|| true
done
```

O loop `for version in ...; do` perdeu a linha `supabase migration repair --status applied $version`. Foi substituída por um comando fixo que marca **5 migrations como reverted** (incluindo a `20260416130544` — que é justamente a migration de realinhamento de UUIDs criada no último deploy).

Resultado: a cada push, o GitHub Actions tenta reverter a migration de fix dos UUIDs. Isso explica por que o usuário pediu "reverter o último deploy" — o workflow já está fazendo isso automaticamente e quebrando o build.

## Diagnóstico

Dois problemas distintos no workflow:

1. **Loop quebrado**: o comando dentro do `for` não usa mais `$version`, então itera 60 vezes executando sempre o mesmo comando fixo (inofensivo mas inútil — só roda 60x a mesma coisa).
2. **Migration de fix marcada como reverted**: `20260416130544` aparece na lista de reverts. Isso faz o Supabase tentar des-aplicar a migration que corrigiu os IDs da Carolina e dos demais usuários.

Além disso, há um bug pré-existente no número: a migration real é `20260416130546` (criada no deploy), mas o workflow lista `20260416130544` (dois dígitos a menos). Mesmo assim, o intent está errado.

## Plano de correção

Restaurar o workflow para:

1. Loop original: `supabase migration repair --status applied $version || true` dentro do `for`.
2. Linha de reverts (antes do loop) mantém só as migrations órfãs originais: `20260402155704 20260415115251 20260415120819` — **sem** incluir a migration de UUID fix.
3. Remover a `20260416130546` de qualquer lista de reverts (ela deve ser aplicada normalmente, não revertida).

## Seção técnica

**Arquivo a editar**: `.github/workflows/supabase.yml`, linhas ~30-56.

**Estado correto desejado**:
```yaml
- name: Sincronizar histórico de migrations com o banco remoto
  run: |
    supabase migration repair --status reverted 20260402155704 20260415115251 20260415120819 || true
    for version in \
      20260327195312 ... 20260414200000; do
      supabase migration repair --status applied $version || true
    done
```

A migration `20260416130546` (fix de UUIDs) **não** entra em nenhuma das duas listas — ela é nova, o `db push --include-all` vai aplicá-la normalmente.

**Nada precisa ser revertido no banco**: a migration de fix dos UUIDs já foi aplicada com sucesso e o Dashboard da Carolina está funcionando. O problema é só o workflow tentando desfazer isso a cada push.

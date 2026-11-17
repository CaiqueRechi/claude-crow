# Flow format

One flow is the end-to-end path of one operation. `lib/flows.mjs save` refuses a
flow without `approved_at`, or with a field rule that does not say where it came
from.

```json
{
  "id": "admin.cost-centers.create",
  "module": "admin",
  "screen": "costCenters",
  "operation": "Cadastrar centro de custo",
  "description": "Cria um centro de custo a partir do menu Administracao.",
  "preset": "admin.cost_center_admin",
  "menu_path": "Administracao / Centros de Custo / Novo",
  "steps": [
    { "action": "goto", "url": "/login" },
    { "action": "fill", "target": "label:E-mail", "value": "{{user.email}}" },
    { "action": "fill", "target": "label:Senha", "value": "{{user.password}}" },
    { "action": "click", "target": "text:Entrar" },
    { "action": "goto", "url": "/cost-centers/create", "mark": "Abra Administracao > Centros de Custo > Novo" },
    { "action": "fill", "target": "css:#code", "value": "CC-TESTE-01", "mark": "Informe o codigo" },
    { "action": "click", "target": "text:Salvar", "mark": "Clique em Salvar" }
  ],
  "fields": [
    {
      "target": "css:#code",
      "label": "Codigo",
      "valid_example": "CC-TESTE-01",
      "rules": [
        { "rule": "obrigatorio", "source": "tela" },
        { "rule": "ate 10 caracteres", "source": "tela" },
        { "rule": "unico por empresa", "source": "documentacao:docs/permissoes.md" }
      ],
      "invalid_examples": [
        { "value": "", "expected_message": "O campo codigo e obrigatorio." }
      ]
    }
  ],
  "result": {
    "description": "O centro aparece na lista com a mensagem de sucesso.",
    "expect": { "message": "Centro de custo cadastrado", "url_contains": "/cost-centers" }
  },
  "denied_presets": [
    { "preset": "admin.viewer", "expected": "o botao Novo nao aparece; /cost-centers/create responde 403" }
  ],
  "approved_by": "Caique",
  "approved_at": "2026-11-17"
}
```

| Field | Meaning |
| --- | --- |
| `steps[].action` | `goto` (with `url`, relative to the application's base URL), `fill`, `select`, `click` |
| `steps[].target` | `css:<selector>`, `text:<visible text>` (button, link) or `label:<field label>` |
| `steps[].value` | literal, or `{{user.email}}` / `{{user.password}}` of the preset's test user |
| `steps[].mark` | when present, the step is marked, numbered and printed in the catalog, with this text as the caption |
| `fields[].rules[].source` | `tela` (seen on screen), `requisitos:<file>`, `documentacao:<file>` or `dono` (he said so) |
| `denied_presets` | presets that must not complete the operation, and what they see instead — the negative tests |

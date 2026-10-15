# php-app — projeto de teste da security-validation

Projeto pequeno e **propositalmente vulnerável**, usado só para avaliar a
skill. Não roda, não tem dependências e não deve ser copiado para nenhum
sistema.

- `src/Vulnerable/` — falhas plantadas: cada arquivo deve dar `FAIL`
- `src/Fixed/` — os mesmos fluxos corrigidos: devem dar `PASS`
- `src/Ambiguous/` — casos sem evidência suficiente para decidir, ou que
  parecem falha e não são
- `views/` — saída HTML, uma insegura e uma segura
- `config/` — configuração com segredo de mentira

Os estados esperados por arquivo estão em `../../expected.json`. O projeto não
usa XML em lugar nenhum, então a regra de XXE deve sair `NOT_APPLICABLE`.

Nenhum segredo daqui é real.

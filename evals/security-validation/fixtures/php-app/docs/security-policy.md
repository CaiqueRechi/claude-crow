# Política de segurança do php-app

- Segredos (senhas, chaves, tokens) não podem ficar no repositório; vêm de
  variáveis de ambiente injetadas pelo cofre.
- Toda consulta usa parâmetros.
- Faturas só podem ser vistas pelo cliente dono delas.
- Downloads só servem arquivos de `storage/public`.

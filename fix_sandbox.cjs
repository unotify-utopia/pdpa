const { Client } = require('ssh2');
const conn = new Client();
conn.on(+ready', () => {
  conn.exec(`sudo -u postgres psql -d pdpa_prod_db -c "UPDATE users SET org_id = 'default-tenant' WHERE org_id = 'org_dopa';"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', data => console.log(Y]K����[��
JJB���\���ۊ	�]I�]HO��ۜ��K�\��܊]K����[��
JJNJNJK��ۛ�X�
���	�LNK�NK�L������ܝ����\�\��[YN�	ܛ��	��\���ܙ�	��M��^[���MQ�JN
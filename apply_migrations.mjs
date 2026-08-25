import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Conexão com o Supabase fornecida pelo usuário
// Host: aws-0-sa-east-1.pooler.supabase.com (Padrão para a região de SP no Supabase Cloud) ou diretamente o host do projeto
// Visto que o domínio é supabase.geneze.online, e é self-hosted (provavelmente), vamos usar a porta 5432
// A string de conexão PostgreSQL padrão:
const connectionString = "postgresql://lsbarcaro:@Panaleo0@supabase.geneze.online:5432/postgres";

async function runMigrations() {
  console.log("Iniciando a execução das migrações no banco de dados...");
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Necessário para conexões seguras remotas
  });

  try {
    await client.connect();
    console.log("Conectado ao PostgreSQL com sucesso!");

    const migrations = [
      'migration_tracking_columns.sql',
      'migration_rpc_motorista.sql',
      'migration_trigger_status.sql',
      'migration_data_locacao.sql'
    ];

    for (const file of migrations) {
      console.log(`\nLendo e executando: ${file}...`);
      try {
        const sql = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
        await client.query(sql);
        console.log(`✅ Sucesso ao aplicar: ${file}`);
      } catch (err) {
        console.error(`❌ Erro ao aplicar ${file}:`, err.message);
        // Não vamos parar a execução completa se for um erro de "coluna já existe", mas logamos
      }
    }

    console.log("\nTodas as migrações foram executadas.");
  } catch (err) {
    console.error("Erro na conexão com o banco de dados:", err);
  } finally {
    await client.end();
  }
}

runMigrations();


import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createClient } from '@supabase/supabase-js';

// =====================================================
// 1. CARGAR VARIABLES DE ENTORNO
// =====================================================

const envPath = fileURLToPath(
  new URL('../.env', import.meta.url),
);

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    'Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en el archivo .env.',
  );
}

// =====================================================
// 2. CONECTAR CON SUPABASE
// =====================================================

const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// =====================================================
// 3. SOLICITAR CONTRASEÑA OCULTA
// =====================================================

function askHidden(question) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
      reject(
        new Error(
          'Se necesita una terminal interactiva para ingresar la contraseña.',
        ),
      );
      return;
    }

    let password = '';

    stdout.write(question);
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
    };

    const finish = () => {
      cleanup();
      resolve(password);
    };

    const onData = (character) => {
      if (character === '\u0003') {
        cleanup();
        reject(new Error('Operación cancelada.'));
        return;
      }

      if (character === '\r' || character === '\n') {
        finish();
        return;
      }

      if (character === '\u007f' || character === '\b') {
        password = password.slice(0, -1);
        return;
      }

      if (character >= ' ') {
        password += character;
      }
    };

    stdin.on('data', onData);
  });
}

// =====================================================
// 4. INICIALIZAR SUPERADMINISTRADOR
// =====================================================

async function createInitialSuperadmin() {
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });

  let createdUserId = null;

  try {
    console.log('\n=== INICIALIZACION DEL SUPERADMINISTRADOR ===\n');

    const fullName = (
      await rl.question('Nombre completo: ')
    ).trim();

    const email = (
      await rl.question('Correo electronico: ')
    ).trim().toLowerCase();

    const phone = (
      await rl.question('Telefono (opcional): ')
    ).trim();

    if (!fullName || !email) {
      throw new Error(
        'El nombre completo y el correo son obligatorios.',
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(
        'El correo electronico no tiene un formato valido.',
      );
    }

    rl.close();

    const password = await askHidden(
      'Contraseña inicial (minimo 12 caracteres): ',
    );

    if (password.length < 12) {
      throw new Error(
        'La contraseña debe tener al menos 12 caracteres.',
      );
    }

    const confirmation = await askHidden(
      'Confirma la contraseña: ',
    );

    if (password !== confirmation) {
      throw new Error('Las contraseñas no coinciden.');
    }

    // =================================================
    // 4.1 COMPROBAR SI YA EXISTE UN SUPERADMIN
    // =================================================

    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('role', 'superadmin');

    if (countError) {
      throw new Error(
        `No se pudo comprobar el superadmin existente: ${countError.message}`,
      );
    }

    if (count > 0) {
      throw new Error(
        'Ya existe un superadministrador. No se creará otro.',
      );
    }

    // =================================================
    // 4.2 CREAR CUENTA INICIAL COMO CLIENTE
    // =================================================

    console.log('\nCreando cuenta inicial...');

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,

      user_metadata: {
        full_name: fullName,
        phone: phone || null,
        role: 'client',
      },
    });

    if (error) {
      throw new Error(
        `Supabase no pudo crear la cuenta: ${error.message}`,
      );
    }

    if (!data.user) {
      throw new Error(
        'Supabase no devolvió información del usuario creado.',
      );
    }

    createdUserId = data.user.id;

    // =================================================
    // 4.3 ASIGNAR METADATOS ADMINISTRATIVOS
    // =================================================

    console.log('Asignando metadatos administrativos...');

    const { error: metadataError } =
      await supabase.auth.admin.updateUserById(
        createdUserId,
        {
          app_metadata: {
            role: 'superadmin',
            provisioned_by: 'bootstrap',
          },
        },
      );

    if (metadataError) {
      throw new Error(
        `No se pudieron actualizar los metadatos: ${metadataError.message}. ID de la cuenta creada: ${createdUserId}. Revisa Supabase antes de continuar.`,
      );
    }

    // =================================================
    // 4.4 CONVERTIR EL PERFIL EN SUPERADMIN
    // =================================================

    console.log('Inicializando perfil superadmin...');

    const { error: bootstrapError } = await supabase.rpc(
      'bootstrap_superadmin',
      {
        p_user_id: createdUserId,
      },
    );

    if (bootstrapError) {
      throw new Error(
        `No se pudo inicializar el superadmin: ${bootstrapError.message}. ID de la cuenta creada: ${createdUserId}. Revisa Supabase antes de volver a ejecutar el script.`,
      );
    }

    // =================================================
    // 4.5 VERIFICAR EL PERFIL FINAL
    // =================================================

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('id, full_name, role, phone')
        .eq('id', createdUserId)
        .maybeSingle();

    if (profileError) {
      throw new Error(
        `No se pudo verificar el perfil: ${profileError.message}. ID de la cuenta: ${createdUserId}.`,
      );
    }

    if (!profile || profile.role !== 'superadmin') {
      throw new Error(
        `No se encontró el perfil superadmin esperado. ID de la cuenta: ${createdUserId}. Revisa Supabase.`,
      );
    }

    // =================================================
    // 4.6 MOSTRAR RESULTADO
    // =================================================

    console.log('\n==========================================');
    console.log('SUPERADMINISTRADOR CREADO CORRECTAMENTE');
    console.log('==========================================');

    console.log({
      id: profile.id,
      fullName: profile.full_name,
      email: data.user.email,
      role: profile.role,
    });

  } finally {
    if (!rl.closed) {
      rl.close();
    }
  }
}

// =====================================================
// 5. EJECUTAR PROCESO
// =====================================================

createInitialSuperadmin().catch((error) => {
  console.error('\nERROR:', error.message);
  process.exitCode = 1;
});

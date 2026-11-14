# Reabastecimiento en Administración de Movilidad

La solapa lista las tareas vigentes de todos los eventos desde
`GET /api/v1/admin/festival-restock-tasks`. Se puede buscar por estación o evento y
actualizar el listado. Las horas límite se muestran en la zona de Buenos Aires.

## Probar con el backend local

1. Con el parche del backend y el perfil `festival-local` en modo abierto, simulá uno
   o más eventos con horario de fin futuro. Las tareas se guardan en MySQL.
2. Detené solo el proceso de Gradle con Ctrl+C. Para que el panel admita el ingreso
   de personal municipal, reiniciá el backend con seguridad habilitada y la misma
   base. El ejemplo usa el contenedor local del festival (puerto 3307):

   ```powershell
   $key = New-Object byte[] 32
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $rng.GetBytes($key)
   $rng.Dispose()
   $env:CITIZEN_AUTH_SECRET = [Convert]::ToBase64String($key).TrimEnd('=').Replace('+', '-').Replace('/', '_')
   .\gradlew.bat bootRun --no-daemon --args="--spring.profiles.active=festival-local --security.local.enabled=false --server.port=8085 --spring.datasource.url=jdbc:mysql://127.0.0.1:3307/movilidad --spring.datasource.username=root --spring.datasource.password=root"
   ```

3. En otra ventana de PowerShell, desde el repo del frontend, instalá y arrancá:

   ```powershell
   npm ci
   $env:VITE_API_BASE_URL = 'http://127.0.0.1:8085'
   npm run dev -- --host localhost --port 5173 --strictPort
   ```

4. Abrí `http://localhost:5173/login` e ingresá con una cuenta de **Personal municipal**
   con permisos de administración de Movilidad. Entrá a **Administración → Reabastecimiento**.
   La cuenta municipal usa el Login Federado existente.

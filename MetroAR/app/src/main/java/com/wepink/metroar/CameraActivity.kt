package com.wepink.metroar

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.net.Uri
import android.os.Bundle
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import android.view.LayoutInflater
import android.view.View // NOVO IMPORT
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Button
import android.widget.ImageButton
import android.widget.RadioGroup // NOVO IMPORT
import android.widget.Toast
import androidx.annotation.RequiresPermission
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout // NOVO IMPORT
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import java.io.File
import java.io.FileInputStream
import java.io.IOException
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import android.content.Intent

// -------------------------------------------------------------------
// MODELOS DE DADOS (Não alterados)
// -------------------------------------------------------------------
data class GpsData(
    val latitude: Double?, val longitude: Double?, val altitude_metros: Double? = null,
    val precisao_metros: Float? = null, val status: String? = null
)
data class OrientationData(
    val azimute_graus: Double, val pitch_graus: Double, val roll_graus: Double
)
data class CaptureRequest(
    val nomeObra: String, val pontoDeVista: String, val descricao: String,
    val criado_em: String, val gps: GpsData, val orientacao: OrientationData,
    val imageBase64: String, val folder: String
)
data class ApiResponse(val success: Boolean, val message: String)
data class FolderResponse(val name: String, val date: String)

interface ApiServicee {
    @POST("/api/captures/upload")
    suspend fun uploadCapture(@Body request: CaptureRequest): Response<ApiResponse>

    @GET("/api/folders")
    suspend fun getFolders(): Response<List<FolderResponse>>
}
// -------------------------------------------------------------------

class CameraActivity : AppCompatActivity(), SensorEventListener {
    // Novas variáveis globais para armazenar imagem capturada e timestamp
    private var lastCapturedImageBase64: String? = null
    private var lastCapturedTimestamp: String? = null
    // (Variáveis de UI, Câmera, Localização, etc.)
    private lateinit var apiService: ApiService
    private lateinit var cameraPreviewView: PreviewView
    private lateinit var captureButton: ImageButton
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var cameraProviderFuture: ListenableFuture<ProcessCameraProvider>
    private var imageCapture: ImageCapture? = null
    private var folderList = mutableListOf<String>()
    private lateinit var folderAdapter: ArrayAdapter<String>
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var currentLocation: Location? = null
    private lateinit var locationCallback: LocationCallback
    private var requestingLocationUpdates = false
    private lateinit var sensorManager: SensorManager
    private var rotationVectorSensor: Sensor? = null
    private val rotationMatrix = FloatArray(9)
    private val orientationAngles = FloatArray(3)
    private lateinit var arButton: ImageButton
    private var isARModeEnabled = false



    // Diretório de saída local para imagens
    private val outputDirectory: File by lazy {
        val mediaDir = externalMediaDirs.firstOrNull()?.let {
            File(it, "MetroAR-Images").apply { mkdirs() }
        }
        if (mediaDir != null && mediaDir.exists()) mediaDir else filesDir
    }

    @RequiresPermission(allOf = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION])
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_camera)

        // Retrieve folder name from intent if present
        val receivedFolder = intent.getStringExtra("folderName")

        // (Inicialização da UI)
        cameraPreviewView = findViewById(R.id.previewView)
        captureButton = findViewById(R.id.btnCapture)
        arButton = findViewById(R.id.btnAR)
        arButton.setOnClickListener {
            val intent = Intent(this, ARActivity::class.java)
            startActivity(intent)
        }

        val homeButton = findViewById<ImageButton>(R.id.btnHome)
        homeButton.setOnClickListener {
            val intent = Intent(this, HomeActivity::class.java)
            startActivity(intent)
            finish()
        }

        cameraExecutor = Executors.newSingleThreadExecutor()

        // Botão Flash (ligar/desligar lanterna)
        val flashButton = findViewById<ImageButton>(R.id.btnFlash)
        var isFlashOn = false

        flashButton.setOnClickListener {
            val cameraProvider = cameraProviderFuture.get()
            val camera = cameraProvider.bindToLifecycle(
                this,
                CameraSelector.DEFAULT_BACK_CAMERA,
                imageCapture
            )

            val cameraControl = camera.cameraControl
            if (!isFlashOn) {
                cameraControl.enableTorch(true)
                isFlashOn = true
                flashButton.setImageResource(R.drawable.ic_flash_on)
            } else {
                cameraControl.enableTorch(false)
                isFlashOn = false
                flashButton.setImageResource(R.drawable.ic_flash_off)
            }
        }

        val galleryButton = findViewById<ImageButton>(R.id.btnGallery)
        galleryButton.setOnClickListener {
            val intent = Intent(this, GaleriaActivity::class.java)
            startActivity(intent)
        }

        setupFolderAdapter() // Prepara o adapter para o pop-up
        cameraExecutor = Executors.newSingleThreadExecutor()

        // (Inicialização Retrofit)
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        apiService = retrofit.create(ApiService::class.java)

        // (Inicialização de Localização e Sensores)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createLocationCallback()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        rotationVectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)

        if (allPermissionsGranted()) {
            startCamera()
            startLocationUpdates()
        } else {
            ActivityCompat.requestPermissions(
                this, REQUIRED_PERMISSIONS, REQUEST_CODE_PERMISSIONS
            )
        }

        captureButton.setOnClickListener { takePhotoOnly() }
        fetchFolders() // Busca as pastas do servidor ao iniciar
    }

    // --- MÉTODOS CÂMERA, LOCATION, SENSORES (Não alterados) ---
    private fun startCamera() {
        cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(cameraPreviewView.surfaceProvider)
            }
            imageCapture = ImageCapture.Builder().build()
            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture)
            } catch (exc: Exception) {
                Log.e(TAG, "Falha ao conectar a câmera", exc)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun createLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                currentLocation = locationResult.lastLocation
            }
        }
    }

    @RequiresPermission(anyOf = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION])
    private fun startLocationUpdates() {
        if (!allPermissionsGranted()) return

        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        if (!requestingLocationUpdates) {
            val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000)
                .setMinUpdateIntervalMillis(5000)
                .build()
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
            requestingLocationUpdates = true
        }
    }

    private fun stopLocationUpdates() {
        if (requestingLocationUpdates) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            requestingLocationUpdates = false
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_ROTATION_VECTOR) {
            SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values)
            SensorManager.getOrientation(rotationMatrix, orientationAngles)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Nada
    }
    // --- FIM MÉTODOS CÂMERA, LOCATION, SENSORES ---

    // --- LÓGICA DE PASTAS E UPLOAD (Atualizada) ---

    private fun setupFolderAdapter() {
        // Apenas inicializa o adapter. Ele será usado no Pop-up.
        folderAdapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, folderList)
    }

    private fun fetchFolders() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = apiService.getFolders()
                if (response.isSuccessful && response.body() != null) {
                    val names = response.body()!!.map { it.name }
                    runOnUiThread {
                        folderList.clear()
                        folderList.addAll(names)
                        folderAdapter.notifyDataSetChanged() // Atualiza o adapter em tempo real
                        Log.d(TAG, "Pastas carregadas: $names")
                    }
                } else {
                    Log.e(TAG, "Erro ao buscar pastas: ${response.code()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Falha na rede ao buscar pastas", e)
            }
        }
    }

    /**
     * FUNÇÃO RETROFIT: (Atualizada)
     */
    private fun uploadDataToMongoDb(captureRequest: CaptureRequest) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = apiService.uploadCapture(captureRequest)
                runOnUiThread {
                    if (response.isSuccessful && response.body()?.success == true) {
                        Toast.makeText(baseContext, "Dados e imagem enviados com sucesso!", Toast.LENGTH_LONG).show()
                        fetchFolders()
                    } else {
                        val errorMsg = response.body()?.message ?: "Erro ${response.code()}"
                        Toast.makeText(baseContext, "Erro no servidor: $errorMsg", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Erro de Conexão Retrofit/Rede", e)
                runOnUiThread {
                    Toast.makeText(baseContext, "Erro de rede: Servidor Mongoose não encontrado.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    // --- FUNÇÃO DE CAPTURA (Fluxo Atualizado) ---

    /**
     * Exibe o diálogo de informações da captura antes de tirar a foto.
     */
    /**
     * Exibe o diálogo de informações da captura antes de tirar a foto.
     */
    private fun showCaptureInfoDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_capture_info, null)
        val obraInput = dialogView.findViewById<TextInputEditText>(R.id.dialog_obra_edit_text)
        val pontoDeVistaInput = dialogView.findViewById<TextInputEditText>(R.id.dialog_ponto_de_vista_edit_text)
        val descricaoInput = dialogView.findViewById<TextInputEditText>(R.id.dialog_descricao_edit_text)

        val dialog = AlertDialog.Builder(this)
            .setTitle("Informações da Captura")
            .setView(dialogView)
            .setPositiveButton("Continuar") { dialogInterface, _ ->
                val nomeObra = obraInput.text?.toString()?.trim().orEmpty()
                val pontoDeVista = pontoDeVistaInput.text?.toString()?.trim().orEmpty()
                val descricao = descricaoInput.text?.toString()?.trim().orEmpty()

                if (nomeObra.isEmpty()) {
                    Toast.makeText(this, "Por favor, preencha o Nome da Obra", Toast.LENGTH_SHORT).show()
                } else {
                    dialogInterface.dismiss()
                    takePhotoAndSaveData(nomeObra, pontoDeVista, descricao)
                }
            }
            .setNegativeButton("Cancelar") { dialogInterface, _ ->
                dialogInterface.dismiss()
            }
            .create()

        dialog.show()
    }

    /**
     * Captura a imagem sem solicitar informações adicionais.
     */
    private fun takePhotoOnly() {
        val imageCapture = imageCapture ?: return

        val safeNomeObra = "temp"
        val currentDate = Date(System.currentTimeMillis())
        val fileTimestampFormat = SimpleDateFormat("yyyyMMdd_HHmmssSSS", Locale.US)
        val baseFileName = "${safeNomeObra}_${fileTimestampFormat.format(currentDate)}"
        val photoFile = File(outputDirectory, "${baseFileName}.jpg")

        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onError(exc: ImageCaptureException) {
                    Log.e(TAG, "Erro ao capturar imagem: ${exc.message}", exc)
                }

                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    try {
                        val bytes = photoFile.readBytes()
                        val base64String = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
                        lastCapturedImageBase64 = base64String

                        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US)
                        lastCapturedTimestamp = isoFormat.format(currentDate)

                        runOnUiThread {
                            Toast.makeText(baseContext, "Imagem capturada!", Toast.LENGTH_SHORT).show()
                            showCaptureInfoDialog()
                        }
                    } catch (e: IOException) {
                        Log.e(TAG, "Erro lendo imagem capturada", e)
                    }
                }
            }
        )
    }

    /**
     * Captura a imagem e prepara os dados, recebendo os campos do usuário.
     */
    private fun takePhotoAndSaveData(nomeObra: String, pontoDeVista: String, descricao: String) {
        val imageCapture = imageCapture ?: return

        // 1. Lê os metadados da UI
        val safeNomeObra = nomeObra.replace(Regex("[^a-zA-Z0-9_.-]"), "_")
        val currentTimeMillis = System.currentTimeMillis()
        val currentDate = Date(currentTimeMillis)
        val fileTimestampFormat = SimpleDateFormat("yyyyMMdd_HHmmssSSS", Locale.US)
        val baseFileName = "${safeNomeObra}_${fileTimestampFormat.format(currentDate)}"
        val isoTimestampFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US)
        val timestampCompleto = isoTimestampFormat.format(currentDate)

        // Define o diretório de saída local
        val photoFile = File(
            outputDirectory,
            "${baseFileName}.jpg"
        )

        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onError(exc: ImageCaptureException) {
                    Log.e(TAG, "Erro salvando foto: ${exc.message}", exc)
                }

                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    try {
                        val bytes = photoFile.readBytes()
                        val base64String = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)

                        val gpsData = GpsData(
                            latitude = currentLocation?.latitude,
                            longitude = currentLocation?.longitude,
                            altitude_metros = currentLocation?.altitude,
                            precisao_metros = currentLocation?.accuracy,
                            status = if (currentLocation != null) null else "Não disponível"
                        )
                        val orientationData = OrientationData(
                            azimute_graus = Math.toDegrees(orientationAngles[0].toDouble()),
                            pitch_graus = Math.toDegrees(orientationAngles[1].toDouble()),
                            roll_graus = Math.toDegrees(orientationAngles[2].toDouble())
                        )

                        runOnUiThread {
                            val folderFromIntent = intent.getStringExtra("folderName")
                            if (folderFromIntent != null) {
                                val finalRequest = CaptureRequest(
                                    nomeObra, pontoDeVista, descricao, timestampCompleto,
                                    gpsData, orientationData, base64String, folderFromIntent
                                )
                                uploadDataToMongoDb(finalRequest)
                            } else {
                                showFolderSelectDialog(
                                    nomeObra, pontoDeVista, descricao, timestampCompleto,
                                    gpsData, orientationData, base64String
                                )
                            }
                        }
                    } catch (e: IOException) {
                        Log.e(TAG, "Erro ao ler imagem salva", e)
                        runOnUiThread {
                            Toast.makeText(baseContext, "Erro ao processar imagem.", Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }
        )
    }

    /**
     * MÉTODO ATUALIZADO: Exibe o pop-up com lógica de Radio Button.
     */
    private fun showFolderSelectDialog(
        nomeObra: String,
        pontoDeVista: String,
        descricao: String,
        criado_em: String,
        gpsData: GpsData,
        orientationData: OrientationData,
        imageBase64: String
    ) {
        // 1. Infla o layout do diálogo (dialog_folder_select.xml)
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_folder_select, null)

        // 2. Referencia TODOS os novos componentes do pop-up
        val radioGroup = dialogView.findViewById<RadioGroup>(R.id.folder_radio_group)
        val selectLayout = dialogView.findViewById<TextInputLayout>(R.id.dialog_folder_select_layout)
        val createLayout = dialogView.findViewById<TextInputLayout>(R.id.dialog_folder_create_layout)
        val dialogAutoComplete = dialogView.findViewById<AutoCompleteTextView>(R.id.dialog_folder_autocomplete)
        val dialogNewFolderText = dialogView.findViewById<TextInputEditText>(R.id.dialog_folder_new_edittext)

        // 3. Configura o adapter de seleção
        dialogAutoComplete.setAdapter(folderAdapter)
        dialogAutoComplete.threshold = 1

        // 4. Lógica de visibilidade (Radio Buttons)
        radioGroup.setOnCheckedChangeListener { _, checkedId ->
            if (checkedId == R.id.radio_select_folder) {
                // Modo "Selecionar"
                selectLayout.visibility = View.VISIBLE
                createLayout.visibility = View.GONE
            } else {
                // Modo "Criar"
                selectLayout.visibility = View.GONE
                createLayout.visibility = View.VISIBLE
            }
        }

        // 5. Cria o AlertDialog
        val builder = AlertDialog.Builder(this)
        builder.setView(dialogView)

        builder.setPositiveButton("Salvar") { dialog, _ ->
            val folderName: String

            // 6. Pega o nome da pasta baseado no modo selecionado
            if (radioGroup.checkedRadioButtonId == R.id.radio_select_folder) {
                folderName = dialogAutoComplete.text.toString().trim()
            } else {
                folderName = dialogNewFolderText.text.toString().trim()
            }

            if (folderName.isEmpty()) {
                Toast.makeText(this, "O nome da pasta não pode estar vazio.", Toast.LENGTH_SHORT).show()
            } else {
                // 7. Monta o request final usando dados da última imagem capturada se disponíveis
                val finalRequest = CaptureRequest(
                    nomeObra = nomeObra,
                    pontoDeVista = pontoDeVista,
                    descricao = descricao,
                    criado_em = lastCapturedTimestamp ?: criado_em,
                    gps = gpsData,
                    orientacao = orientationData,
                    imageBase64 = lastCapturedImageBase64 ?: imageBase64,
                    folder = folderName // O nome da pasta vindo do pop-up
                )

                // 8. Envia para o servidor
                uploadDataToMongoDb(finalRequest)
                dialog.dismiss()
            }
        }

        builder.setNegativeButton("Cancelar") { dialog, _ ->
            dialog.dismiss()
        }

        builder.create().show()
    }


    // --- MÉTODOS DE PERMISSÃO E LIFECYCLE (Não alterados) ---
    @RequiresPermission(allOf = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION])
    override fun onResume() {
        super.onResume()
        if (allPermissionsGranted()) {
            startLocationUpdates()
            rotationVectorSensor?.also { sensor ->
                sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME)
            }
        }
    }

    override fun onPause() {
        super.onPause()
        stopLocationUpdates()
        sensorManager.unregisterListener(this)
    }

    private fun allPermissionsGranted() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
    }

    @RequiresPermission(allOf = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION])
    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            if (allPermissionsGranted()) {
                startCamera()
                startLocationUpdates()
            } else {
                Toast.makeText(this, "Permissões não concedidas.", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        stopLocationUpdates()
    }

    companion object {
        private const val TAG = "MetroAR_MainActivity"
        private const val REQUEST_CODE_PERMISSIONS = 10

        // ⚠️ Lembre-se de usar o IP correto do seu servidor Mongoose
        private const val BASE_URL = "http://192.168.15.81:3000/" // IP do Emulador

        // ATUALIZADO: Lista de permissões sem WRITE_EXTERNAL_STORAGE
        private val REQUIRED_PERMISSIONS =
            mutableListOf(
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ).toTypedArray()
    }
}
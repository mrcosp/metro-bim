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
import android.os.Bundle
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import android.widget.Button
import android.widget.Toast
import androidx.annotation.RequiresPermission
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
import com.google.common.util.concurrent.ListenableFuture

// --- IMPORTS DE REDE E COROUTINES (Resolvendo os erros de referência) ---
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
// --- FIM IMPORTS DE REDE ---

import java.io.File
import java.io.FileInputStream
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

// -------------------------------------------------------------------
// 1. MODELOS DE DADOS PARA RETROFIT
// -------------------------------------------------------------------

data class GpsData(
    val latitude: Double?,
    val longitude: Double?,
    val altitude_metros: Double? = null,
    val precisao_metros: Float? = null,
    val status: String? = null
)

data class OrientationData(
    val azimute_graus: Double,
    val pitch_graus: Double,
    val roll_graus: Double
)

data class CaptureRequest(
    val nomeObra: String,
    val pontoDeVista: String,
    val descricao: String,
    val criado_em: String,
    val gps: GpsData,
    val orientacao: OrientationData,
    val imageBase64: String // O campo que o servidor Mongoose espera
)

data class ApiResponse(
    val success: Boolean,
    val message: String
)

interface ApiService {
    @POST("/api/captures/upload")
    suspend fun uploadCapture(@Body request: CaptureRequest): Response<ApiResponse>
}


class MainActivity : AppCompatActivity(), SensorEventListener {

    // VARIÁVEL DE SERVIÇO RETROFIT
    private lateinit var apiService: ApiService

    // UI and Camera variables
    private lateinit var cameraPreviewView: PreviewView
    private lateinit var captureButton: Button
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var cameraProviderFuture: ListenableFuture<ProcessCameraProvider>
    private var imageCapture: ImageCapture? = null

    // CAMPOS DE TEXTO
    private lateinit var obraEditText: TextInputEditText
    private lateinit var pontoDeVistaEditText: TextInputEditText
    private lateinit var descricaoEditText: TextInputEditText

    // Location variables
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var currentLocation: Location? = null
    private lateinit var locationCallback: LocationCallback
    private var requestingLocationUpdates = false

    // Sensor variables
    private lateinit var sensorManager: SensorManager
    private var rotationVectorSensor: Sensor? = null
    private val rotationMatrix = FloatArray(9)
    private val orientationAngles = FloatArray(3) // Azimuth, Pitch, Roll (in radians)

    @RequiresPermission(allOf = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION])
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        cameraPreviewView = findViewById(R.id.camera_preview)
        captureButton = findViewById(R.id.capture_button)

        obraEditText = findViewById(R.id.obra_edit_text)
        pontoDeVistaEditText = findViewById(R.id.ponto_de_vista_edit_text)
        descricaoEditText = findViewById(R.id.descricao_edit_text)

        cameraExecutor = Executors.newSingleThreadExecutor()

        // --- INICIALIZAÇÃO RETROFIT ---
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        apiService = retrofit.create(ApiService::class.java)
        // ----------------------------

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createLocationCallback()

        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        rotationVectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
        if (rotationVectorSensor == null) {
            Toast.makeText(this, "Sensor de Rotação não disponível.", Toast.LENGTH_LONG).show()
        }

        if (allPermissionsGranted()) {
            startCamera()
            startLocationUpdates()
        } else {
            ActivityCompat.requestPermissions(
                this, REQUIRED_PERMISSIONS, REQUEST_CODE_PERMISSIONS
            )
        }

        captureButton.setOnClickListener { takePhotoAndSaveData() }
    }

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

    private fun getFilePathFromUri(uri: android.net.Uri): String? {
        var cursor: Cursor? = null
        try {
            val projection = arrayOf(MediaStore.Images.Media.DATA)
            cursor = contentResolver.query(uri, projection, null, null, null)
            if (cursor != null && cursor.moveToFirst()) {
                val columnIndex = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA)
                return cursor.getString(columnIndex)
            }
        } finally {
            cursor?.close()
        }
        return null
    }

    /**
     * FUNÇÃO RETROFIT: Envia o documento JSON para o SERVIDOR MONGOOSE via API REST.
     */
    private fun uploadDataToMongoDb(captureRequest: CaptureRequest) {
        // Usa Coroutines para gerenciar a chamada de rede assíncrona
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = apiService.uploadCapture(captureRequest)

                runOnUiThread {
                    if (response.isSuccessful) {
                        val apiResponse = response.body()
                        if (apiResponse?.success == true) {
                            Toast.makeText(baseContext, "Dados e Imagem Base64 salvos no Mongo!", Toast.LENGTH_LONG).show()
                            obraEditText.text?.clear()
                            pontoDeVistaEditText.text?.clear()
                            descricaoEditText.text?.clear()
                        } else {
                            // Erro de lógica do servidor (ex: validação falhou)
                            Toast.makeText(baseContext, "Erro no Servidor: ${apiResponse?.message}", Toast.LENGTH_LONG).show()
                        }
                    } else {
                        // Erro HTTP (ex: 404, 500)
                        val errorBody = response.errorBody()?.string() ?: "Erro desconhecido"
                        Toast.makeText(baseContext, "Erro HTTP: ${response.code()} - ${response.message()}", Toast.LENGTH_LONG).show()
                        Log.e(TAG, "Erro HTTP: ${response.code()} - $errorBody")
                    }
                }
            } catch (e: Exception) {
                // Erro de rede (servidor desligado, IP errado)
                Log.e(TAG, "Erro de Conexão Retrofit/Rede", e)
                runOnUiThread {
                    Toast.makeText(baseContext, "Erro de rede: Servidor Mongoose não encontrado.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun takePhotoAndSaveData() {
        val imageCapture = imageCapture ?: return

        val nomeObra = obraEditText.text.toString().trim()
        val pontoDeVista = pontoDeVistaEditText.text.toString().trim()
        val descricao = descricaoEditText.text.toString().trim()

        if (nomeObra.isEmpty()) {
            Toast.makeText(this, "Por favor, insira o nome da obra", Toast.LENGTH_SHORT).show()
            return
        }

        val safeNomeObra = nomeObra.replace(Regex("[^a-zA-Z0-9_.-]"), "_")
        val currentTimeMillis = System.currentTimeMillis()
        val currentDate = Date(currentTimeMillis)
        val fileTimestampFormat = SimpleDateFormat("yyyyMMdd_HHmmssSSS", Locale.US)
        val baseFileName = "${safeNomeObra}_${fileTimestampFormat.format(currentDate)}"
        val isoTimestampFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US)
        val timestampCompleto = isoTimestampFormat.format(currentDate)


        // --- 1. Captura da Imagem (Salvando localmente) ---
        val contentValues = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, baseFileName)
            put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/MetroAR-Images")
        }
        val outputOptions = ImageCapture.OutputFileOptions.Builder(
            contentResolver,
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            contentValues
        ).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onError(exc: ImageCaptureException) {
                    Log.e(TAG, "Erro salvando foto: ${exc.message}", exc)
                }

                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    val imageUri = output.savedUri ?: return

                    val imagePath = getFilePathFromUri(imageUri)
                    if (imagePath == null) {
                        runOnUiThread { Toast.makeText(baseContext, "Falha ao obter o caminho do arquivo.", Toast.LENGTH_SHORT).show() }
                        return
                    }

                    // --- 2. CONVERTER E ENVIAR BASE64 NA THREAD DE BACKGROUND ---
                    cameraExecutor.execute {
                        try {
                            val imageFile = File(imagePath)
                            val bytes = FileInputStream(imageFile).use { it.readBytes() }
                            // Converte o Array de Bytes para Base64 String
                            val base64String = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)

                            // --- 3. Preparação do OBJETO DE ENVIO ---
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

                            val requestBody = CaptureRequest(
                                nomeObra = nomeObra,
                                pontoDeVista = pontoDeVista,
                                descricao = descricao,
                                criado_em = timestampCompleto,
                                gps = gpsData,
                                orientacao = orientationData,
                                imageBase64 = base64String // ENVIANDO A IMAGEM AQUI
                            )

                            // --- 4. Envio para o Servidor Mongoose ---
                            uploadDataToMongoDb(requestBody)

                        } catch (e: IOException) {
                            Log.e(TAG, "Erro ao ler arquivo ou Base64", e)
                            runOnUiThread {
                                Toast.makeText(baseContext, "Erro: Falha no processamento da imagem.", Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                }
            }
        )
    }

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
        ContextCompat.checkSelfPermission(baseContext, it) == PackageManager.PERMISSION_GRANTED
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

        // BASE URL para o Servidor Mongoose
        // Use o IP local
        private const val BASE_URL = "http://192.168.15.22:3000/"

        private val REQUIRED_PERMISSIONS =
            mutableListOf(
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ).toTypedArray()
    }
}
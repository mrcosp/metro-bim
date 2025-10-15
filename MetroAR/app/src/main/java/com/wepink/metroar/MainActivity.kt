package com.wepink.metroar

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
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
import android.widget.TextView
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
import com.mongodb.MongoException
import com.mongodb.client.MongoClient
import com.mongodb.client.MongoClients
import org.bson.Document
import org.json.JSONObject
import java.io.File
import java.io.FileWriter
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity(), SensorEventListener {

    // UI and Camera variables
    private lateinit var cameraPreviewView: PreviewView
    private lateinit var myTextView: TextView
    private lateinit var captureButton: Button
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var cameraProviderFuture: ListenableFuture<ProcessCameraProvider>
    private var imageCapture: ImageCapture? = null

    // Campos de texto para a estrutura de dados
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
        myTextView = findViewById(R.id.myTextView)
        captureButton = findViewById(R.id.capture_button)

        obraEditText = findViewById(R.id.obra_edit_text)
        pontoDeVistaEditText = findViewById(R.id.ponto_de_vista_edit_text)
        descricaoEditText = findViewById(R.id.descricao_edit_text)

        cameraExecutor = Executors.newSingleThreadExecutor()

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

    /**
     * ATENÇÃO: ESTA FUNÇÃO É INSEGURA E SÓ DEVE SER USADA PARA TESTES LOCAIS.
     * Ela expõe as credenciais do banco de dados no lado do cliente (no app).
     */
    private fun uploadDataToMongoDb(mongoDocument: JSONObject) {
        // NUNCA coloque a string de conexão diretamente em um app de produção.
        val connectionString = "mongodb+srv://metrobim25_db:imtmetrobd@cluster0.tuvnsoi.mongodb.net/metrodb?retryWrites=true&w=majority"

        // Usaremos o cameraExecutor para rodar a operação de rede em background
        cameraExecutor.execute {
            var mongoClient: MongoClient? = null
            try {
                Log.d(TAG, "Tentando conectar ao MongoDB...")
                mongoClient = MongoClients.create(connectionString)

                // Seleciona o seu banco de dados ('metrodb')
                val database = mongoClient.getDatabase("metrodb")

                val collection = database.getCollection("metadata")

                // Converte o JSONObject do Android para um Documento BSON do MongoDB
                val doc = Document.parse(mongoDocument.toString())

                // Insere o documento na coleção
                collection.insertOne(doc)

                Log.d(TAG, "Documento inserido com sucesso no MongoDB!")

                // Para mostrar um Toast, precisamos voltar para a Main Thread
                runOnUiThread {
                    Toast.makeText(baseContext, "Salvo diretamente no MongoDB!", Toast.LENGTH_LONG).show()
                }

            } catch (e: MongoException) {
                Log.e(TAG, "Erro ao conectar ou inserir no MongoDB", e)
                runOnUiThread {
                    Toast.makeText(baseContext, "Erro ao salvar no MongoDB.", Toast.LENGTH_SHORT).show()
                }
            } finally {
                // É crucial fechar a conexão
                mongoClient?.close()
                Log.d(TAG, "Conexão com MongoDB fechada.")
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
        val imageFileNameWithExtension = "$baseFileName.jpg"

        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val dataSimples = dateFormat.format(currentDate)

        val isoTimestampFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US)
        val timestampCompleto = isoTimestampFormat.format(currentDate)

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
                    val mongoDocument = JSONObject()
                    try {
                        mongoDocument.put("obra", nomeObra)
                        mongoDocument.put("data", dataSimples)
                        mongoDocument.put("ponto_de_vista", pontoDeVista)
                        mongoDocument.put("descricao", descricao)
                        mongoDocument.put("arquivo_imagem", imageFileNameWithExtension)
                        mongoDocument.put("criado_em", timestampCompleto)

                        currentLocation?.let { loc ->
                            val gpsData = JSONObject()
                            gpsData.put("latitude", loc.latitude)
                            gpsData.put("longitude", loc.longitude)
                            if (loc.hasAltitude()) gpsData.put("altitude_metros", loc.altitude)
                            if (loc.hasAccuracy()) gpsData.put("precisao_metros", loc.accuracy)
                            mongoDocument.put("gps", gpsData)
                        } ?: mongoDocument.put("gps", "Não disponível")

                        val orientationData = JSONObject()
                        orientationData.put("azimute_graus", Math.toDegrees(orientationAngles[0].toDouble()))
                        orientationData.put("pitch_graus", Math.toDegrees(orientationAngles[1].toDouble()))
                        orientationData.put("roll_graus", Math.toDegrees(orientationAngles[2].toDouble()))
                        mongoDocument.put("orientacao", orientationData)

                    } catch (e: Exception) {
                        Log.e(TAG, "Erro ao criar documento JSON", e)
                        return
                    }

                    // A função agora tentará a inserção direta no banco de dados
                    uploadDataToMongoDb(mongoDocument)
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
        private val REQUIRED_PERMISSIONS =
            mutableListOf(
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ).toTypedArray()
    }
}
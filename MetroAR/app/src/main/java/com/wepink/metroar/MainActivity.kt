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
import org.json.JSONObject
import java.io.File
import java.io.FileWriter
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity(), SensorEventListener { // Implement SensorEventListener

    // UI and Camera variables
    private lateinit var cameraPreviewView: PreviewView
    private lateinit var myTextView: TextView // Not used for core logic, but kept from original
    private lateinit var captureButton: Button
    private lateinit var userInputEditText: TextInputEditText
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var cameraProviderFuture: ListenableFuture<ProcessCameraProvider>
    private var imageCapture: ImageCapture? = null

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
        userInputEditText = findViewById(R.id.user_input_edit_text)

        cameraExecutor = Executors.newSingleThreadExecutor()

        // Initialize Location Services
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createLocationCallback()

        // Initialize Sensor Manager
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        // TYPE_ROTATION_VECTOR is generally preferred as it's more stable and less prone to gimbal lock
        // It fuses accelerometer, magnetometer, and gyroscope data.
        rotationVectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
        if (rotationVectorSensor == null) {
            Toast.makeText(this, "Rotation Vector Sensor not available. Orientation data might be limited.", Toast.LENGTH_LONG).show()
            // You could fall back to TYPE_ACCELEROMETER and TYPE_MAGNETIC_FIELD if needed,
            // but that requires more complex calculations (SensorManager.getRotationMatrix).
        }


        if (allPermissionsGranted()) {
            startCamera()
            startLocationUpdates() // Start location updates if permissions are already granted
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
                Log.d(TAG, "Câmera conectada com sucesso!")
            } catch (exc: Exception) {
                Log.e(TAG, "Deu ruim na hora de conectar a câmera", exc)
                Toast.makeText(this, "Falha ao iniciar a câmera: ${exc.message}", Toast.LENGTH_LONG).show()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun createLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                currentLocation = locationResult.lastLocation
                // Log.d(TAG, "Localização atualizada: ${currentLocation?.latitude}, ${currentLocation?.longitude}")
            }
        }
    }

    @RequiresPermission(anyOf = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION])
    private fun startLocationUpdates() {
        // **THIS IS THE REQUIRED PERMISSION CHECK**
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            // Permissions are not granted.
            // You might want to log this, show a message to the user, or request permissions again.
            // For now, we'll log and return, as the main permission request happens in onCreate.
            Log.w(TAG, "Location permissions are not granted. Cannot start location updates.")
            // Optionally, you could re-request permissions here if it makes sense for your UX,
            // but be careful not to create a permission request loop.
            // ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, REQUEST_CODE_PERMISSIONS)
            return
        }

        // If the check above passes, it's safe to call requestLocationUpdates
        if (!requestingLocationUpdates) {
            val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000) // Interval 10s
                .setMinUpdateIntervalMillis(5000) // Fastest interval 5s
                .build()

            // This call is now properly guarded by the permission check
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
            requestingLocationUpdates = true
            Log.d(TAG, "Iniciando atualizações de localização.")
        }
    }

    private fun stopLocationUpdates() {
        if (requestingLocationUpdates) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            requestingLocationUpdates = false
            Log.d(TAG, "Parando atualizações de localização.")
        }
    }

    // --- SensorEventListener Methods ---
    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_ROTATION_VECTOR) {
            SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values)
            SensorManager.getOrientation(rotationMatrix, orientationAngles)
            // orientationAngles[0] is Azimuth (yaw) in radians (-PI to PI)
            // orientationAngles[1] is Pitch in radians (-PI/2 to PI/2)
            // orientationAngles[2] is Roll in radians (-PI to PI)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Not used in this example, but can be useful.
        // Log.d(TAG, "Sensor ${sensor?.name} accuracy changed to $accuracy")
    }
    // --- End SensorEventListener Methods ---

    private fun takePhotoAndSaveData() {
        val imageCapture = imageCapture ?: return
        val userText = userInputEditText.text.toString().trim()

        if (userText.isEmpty()) {
            Toast.makeText(this, "Por favor, insira um nome para a imagem", Toast.LENGTH_SHORT).show()
            return
        }

        val safeUserText = userText.replace(Regex("[^a-zA-Z0-9_.-]"), "_")
        val currentTimeMillis = System.currentTimeMillis()
        val simpleDateFormat = SimpleDateFormat(FILENAME_FORMAT, Locale.US) // Used for both image and JSON timestamp

        // Base name for image and JSON file (without extension)
        val baseFileName = "${safeUserText}_${simpleDateFormat.format(currentTimeMillis)}"
        val imageFileNameWithExtension = "$baseFileName.jpg" // Assuming JPG
        val jsonFileNameWithExtension = "$baseFileName.json"
        val dateTimeReadable = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date(currentTimeMillis))


        // --- Prepare JSON Data ---
        val jsonData = JSONObject()
        try {
            jsonData.put("image_filename", imageFileNameWithExtension)
            jsonData.put("user_text_input", userText) // Original user text
            jsonData.put("datetime_captured_epoch_millis", currentTimeMillis)
            jsonData.put("datetime_captured_readable", dateTimeReadable)

            currentLocation?.let { loc ->
                val gpsData = JSONObject()
                gpsData.put("latitude", loc.latitude)
                gpsData.put("longitude", loc.longitude)
                if (loc.hasAltitude()) gpsData.put("altitude_meters", loc.altitude)
                if (loc.hasAccuracy()) gpsData.put("accuracy_meters", loc.accuracy)
                if (loc.hasSpeed()) gpsData.put("speed_mps", loc.speed)
                if (loc.hasBearing()) gpsData.put("bearing_degrees", loc.bearing)
                jsonData.put("gps_location", gpsData)
            } ?: jsonData.put("gps_location", "Not available or permission denied")

            val orientationData = JSONObject()
            // Convert radians to degrees for easier interpretation in JSON
            orientationData.put("azimuth_degrees", Math.toDegrees(orientationAngles[0].toDouble()))
            orientationData.put("pitch_degrees", Math.toDegrees(orientationAngles[1].toDouble()))
            orientationData.put("roll_degrees", Math.toDegrees(orientationAngles[2].toDouble()))
            jsonData.put("device_orientation", orientationData)

        } catch (e: Exception) {
            Log.e(TAG, "Erro ao criar dados JSON", e)
            Toast.makeText(this, "Erro ao criar metadados", Toast.LENGTH_SHORT).show()
            // Decide if you still want to take the photo or return
        }
        // --- End Prepare JSON Data ---

        // --- Save Image via MediaStore ---
        val contentValues = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, baseFileName) // MediaStore adds extension based on MIME
            put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/MetroAR-Images") // Standard public directory
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
                    Toast.makeText(baseContext, "Erro salvando foto: ${exc.message}", Toast.LENGTH_SHORT).show()
                }

                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    val imageUri = output.savedUri
                    val msg = "Foto capturada com sucesso: $imageUri"
                    Toast.makeText(baseContext, msg, Toast.LENGTH_SHORT).show()
                    Log.d(TAG, msg)

                    // --- Save JSON File to App-Specific Directory ---
                    if (imageUri != null) { // Only save JSON if image was saved
                        saveJsonToFile(jsonData, jsonFileNameWithExtension)
                    }
                    // userInputEditText.text?.clear() // Optional: clear input field
                }
            }
        )
    }

    private fun saveJsonToFile(jsonData: JSONObject, jsonFilename: String) {
        // Get the directory for the app's private external files.
        // This content is removed when the app is uninstalled.
        // No special permissions needed for this directory.
        val storageDir = getExternalFilesDir("MetroAR_Data") // Creates a subdirectory "MetroAR_Data"
        if (storageDir == null) {
            Log.e(TAG, "Falha ao obter diretório de armazenamento externo para JSON.")
            Toast.makeText(this, "Não foi possível salvar metadados: erro de armazenamento.", Toast.LENGTH_LONG).show()
            return
        }
        // Create the storage directory if it does not exist
        if (!storageDir.exists() && !storageDir.mkdirs()) {
            Log.e(TAG, "Falha ao criar diretório para JSON.")
            Toast.makeText(this, "Não foi possível criar diretório para metadados.", Toast.LENGTH_LONG).show()
            return
        }

        val jsonFile = File(storageDir, jsonFilename)

        try {
            FileWriter(jsonFile).use { writer ->
                writer.write(jsonData.toString(4)) // toString(4) for pretty print JSON
                Log.d(TAG, "Dados JSON salvos em: ${jsonFile.absolutePath}")
                Toast.makeText(this, "Metadados salvos: $jsonFilename", Toast.LENGTH_SHORT).show()
            }
        } catch (e: IOException) {
            Log.e(TAG, "Erro ao escrever JSON no arquivo", e)
            Toast.makeText(this, "Erro ao salvar arquivo de metadados.", Toast.LENGTH_SHORT).show()
        }
    }


    @RequiresPermission(allOf = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION])
    override fun onResume() {
        super.onResume()
        if (allPermissionsGranted()) {
            startLocationUpdates()
            rotationVectorSensor?.also { sensor ->
                sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME) // SENSOR_DELAY_GAME or SENSOR_DELAY_UI
            }
        }
    }

    override fun onPause() {
        super.onPause()
        stopLocationUpdates() // Stop location updates to save battery
        sensorManager.unregisterListener(this) // Unregister sensor listener
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
                startLocationUpdates() // Start location updates after permission grant
            } else {
                Toast.makeText(
                    this,
                    "Permissões não concedidas pelo usuário. Funcionalidades de GPS e câmera podem ser limitadas.",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        Log.d(TAG, "Executor da câmera desligado.")
        // It's good practice to ensure location updates are stopped if the activity is destroyed,
        // though onPause should typically handle it.
        stopLocationUpdates()
    }

    companion object {
        private const val TAG = "MetroAR_MainActivity"
        // FILENAME_FORMAT is for the timestamp part of the filename
        private const val FILENAME_FORMAT = "yyyyMMdd_HHmmssSSS" // More precise timestamp
        private const val REQUEST_CODE_PERMISSIONS = 10
        private val REQUIRED_PERMISSIONS = // Already defined in your code
            mutableListOf(
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ).toTypedArray()
    }
}

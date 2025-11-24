package com.wepink.metroar

import android.os.Bundle
import android.util.Log
import android.widget.ImageButton
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GaleriaActivity : AppCompatActivity() {

    private lateinit var recycler: RecyclerView
    private val images = mutableListOf<String>()
    private val repository = Repository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_galeria)

        recycler = findViewById(R.id.recyclerGallery)
        recycler.layoutManager = GridLayoutManager(this, 3)

        val folder = intent.getStringExtra("folderName")
        if (folder == null) {
            Log.e("GALERIA", "Nenhuma pasta recebida na intent!")
            return
        }

        // Add camera button click handler before home button
        findViewById<ImageButton>(R.id.camera_button).setOnClickListener {
            val intent = android.content.Intent(this, CameraActivity::class.java)
            intent.putExtra("folderName", folder)
            startActivity(intent)
        }

        fetchImages(folder)
    }

    private fun fetchImages(folder: String) {
        Log.d("GALERIA", "🔍 fetchImages() chamado para a pasta: $folder")

        CoroutineScope(Dispatchers.IO).launch {

            Log.d("GALERIA", "🌐 Chamando repository.fetchImages($folder)...")

            val response = try {
                repository.fetchImages(folder)
            } catch (e: Exception) {
                Log.e("GALERIA", "❌ EXCEÇÃO AO CHAMAR API: ${e.message}", e)
                return@launch
            }

            Log.d("GALERIA", "📥 Resposta recebida! Sucesso: ${response.isSuccessful}")

            runOnUiThread {

                if (response.isSuccessful) {

                    val result = response.body()
                    Log.d("GALERIA", "📦 BODY RAW: $result")

                    if (result == null) {
                        Log.e("GALERIA", "❌ Result == NULL")
                        return@runOnUiThread
                    }

                    if (result.isEmpty()) {
                        Log.e("GALERIA", "⚠️ Lista vazia. 0 imagens recebidas.")
                        return@runOnUiThread
                    }

                    images.clear()

                    result.forEachIndexed { index, img ->
                        Log.d("GALERIA", "🖼 [$index] ID=${img.id}, Date=${img.criado_em}, Base64Len=${img.base64.length}")
                    }

                    images.addAll(result.map { it.base64 })

                    Log.d("GALERIA", "📌 Total de imagens adicionadas ao adapter: ${images.size}")

                    recycler.adapter = GaleriaAdapter(images)

                    findViewById<ImageButton>(R.id.home_button).setOnClickListener {
                        finish()
                    }

                } else {
                    val errorBody = response.errorBody()?.string()
                    Log.e("GALERIA", "❌ ERRO HTTP: ${response.code()}")
                    Log.e("GALERIA", "❌ Corpo do erro: $errorBody")
                }
            }
        }
    }
}
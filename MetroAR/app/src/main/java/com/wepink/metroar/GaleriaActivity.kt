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
    private val repository = Repository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_galeria)

        recycler = findViewById(R.id.recyclerGallery)
        recycler.layoutManager = GridLayoutManager(this, 3)

        recycler.adapter = GaleriaAdapter(emptyList())

        val folder = intent.getStringExtra("folderName")
        if (folder == null) {
            Log.e("GALERIA", "Nenhuma pasta recebida!")
            return
        }

        findViewById<ImageButton>(R.id.camera_button).setOnClickListener {
            val intent = android.content.Intent(this, CameraActivity::class.java)
            intent.putExtra("folderName", folder)
            startActivity(intent)
        }

        fetchImages(folder)
    }

    private fun fetchImages(folder: String) {
        CoroutineScope(Dispatchers.IO).launch {

            val response = try {
                repository.fetchImages(folder)
            } catch (e: Exception) {
                Log.e("GALERIA", "Erro API: ${e.message}")
                return@launch
            }

            runOnUiThread {

                if (!response.isSuccessful) {
                    Log.e("GALERIA", "HTTP ${response.code()}")
                    return@runOnUiThread
                }

                val result = response.body()
                if (result.isNullOrEmpty()) {
                    Log.e("GALERIA", "0 imagens na pasta")
                    return@runOnUiThread
                }

                val items = result.map { img ->
                    ImageItem(
                        id = img.id,
                        base64 = img.base64,
                        nome = img.nome_da_obra,
                        descricao = img.descricao,
                        criadoEm = img.criado_em
                    )
                }

                recycler.adapter = GaleriaAdapter(items)

                findViewById<ImageButton>(R.id.home_button).setOnClickListener {
                    finish()
                }
                val refreshButton = findViewById<ImageButton>(R.id.refresh_button)
                refreshButton.setOnClickListener {
                    val folder = intent.getStringExtra("folderName")
                    if (folder != null) {
                        fetchImages(folder)
                    }
                }
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == 1001 && resultCode == RESULT_OK) {
            val folder = intent.getStringExtra("folderName")
            if (folder != null) fetchImages(folder)
        }
    }
}
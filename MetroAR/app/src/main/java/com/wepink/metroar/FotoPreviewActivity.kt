package com.wepink.metroar

import android.graphics.BitmapFactory
import android.os.Bundle
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.URL
import java.net.HttpURLConnection

class FotoPreviewActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_foto_preview)

        val imagePath = intent.getStringExtra("imagePath")
        val imageView = findViewById<ZoomImageView>(R.id.previewImage)

        if (imagePath != null) {
            val file = File(imagePath)
            if (file.exists()) {
                val bitmap = BitmapFactory.decodeFile(file.absolutePath)
                imageView.post { imageView.setImageBitmap(bitmap) }
            }
        }

        val nome = intent.getStringExtra("nome") ?: ""
        val descricao = intent.getStringExtra("descricao") ?: ""
        val criado = intent.getStringExtra("criadoEm") ?: ""

        val bubble = findViewById<TextView>(R.id.info_bubble)
        bubble.text = "$nome\n$descricao\n$criado"

        findViewById<ImageButton>(R.id.back_button).setOnClickListener {
            finish()
        }

        findViewById<ImageButton>(R.id.delete_button).setOnClickListener {
            val imageId = intent.getStringExtra("imageId")

            if (imageId != null) {
                deleteFoto(imageId)
            } else {
                Toast.makeText(this, "ID não encontrado!", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun deleteFoto(imageId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val url = URL("http://10.2.0.202:3000/delete/$imageId")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "DELETE"
                connection.connectTimeout = 5000
                connection.readTimeout = 5000

                val code = connection.responseCode

                runOnUiThread {
                    if (code == 200) {
                        Toast.makeText(this@FotoPreviewActivity, "Imagem deletada!", Toast.LENGTH_SHORT).show()
                        setResult(RESULT_OK)
                        finish()
                    } else {
                        Toast.makeText(this@FotoPreviewActivity, "Erro ao deletar: $code", Toast.LENGTH_LONG).show()
                    }
                }

                connection.disconnect()

            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@FotoPreviewActivity, "Falha de conexão", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}
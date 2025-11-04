package com.wepink.metroar

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.gridlayout.widget.GridLayout
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import com.wepink.metroar.ApiService
import com.wepink.metroar.FolderResponse

class ProjetosActivity : AppCompatActivity() {

    private lateinit var gridProjects: GridLayout
    private lateinit var apiService: ApiService
    private val BASE_URL = "http://192.168.15.81:3000/" // usa o mesmo IP do servidor da câmera

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_projetos)

        val btnAddProject = findViewById<ImageButton>(R.id.btnAddProject)
        val btnHome = findViewById<ImageButton>(R.id.btnHome)
        val btnGallery = findViewById<ImageButton>(R.id.btnGallery)
        gridProjects = findViewById(R.id.gridProjects)

        // Inicializa Retrofit
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        apiService = retrofit.create(ApiService::class.java)

        // Botões inferiores
        btnHome.setOnClickListener {
            finish()
        }
        btnGallery.setOnClickListener {
            val intent = Intent(this, GaleriaActivity::class.java)
            startActivity(intent)
        }

        // Adicionar novo projeto (pasta)
        btnAddProject.setOnClickListener {
            Toast.makeText(this, "Função criar pasta em breve!", Toast.LENGTH_SHORT).show()
        }

        // Carrega as pastas do servidor
        fetchAndDisplayFolders()
    }

    private fun fetchAndDisplayFolders() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = apiService.getFolders()
                if (response.isSuccessful && response.body() != null) {
                    val folders = response.body()!!
                    runOnUiThread {
                        renderFolders(folders)
                    }
                } else {
                    Log.e("ProjetosActivity", "Erro: ${response.code()}")
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(this@ProjetosActivity, "Falha ao conectar ao servidor.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun renderFolders(folders: List<FolderResponse>) {
        gridProjects.removeAllViews()

        for (folder in folders) {
            val layout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                setPadding(16, 16, 16, 16)
            }

            val imageView = ImageView(this).apply {
                setImageResource(R.drawable.ic_folder)
                layoutParams = LinearLayout.LayoutParams(120, 120)
            }

            val nameText = TextView(this).apply {
                text = "Nome: ${folder.name}"
                setTextColor(resources.getColor(android.R.color.white))
                textSize = 13f
                setPadding(0, 8, 0, 0)
            }

            val dateText = TextView(this).apply {
                text = "Data: ${folder.date}"
                setTextColor(resources.getColor(android.R.color.darker_gray))
                textSize = 12f
            }

            layout.addView(imageView)
            layout.addView(nameText)
            layout.addView(dateText)

            layout.setOnClickListener {
                // Abre a galeria específica da pasta
                val intent = Intent(this, GaleriaActivity::class.java)
                intent.putExtra("folderName", folder.name)
                startActivity(intent)
            }

            gridProjects.addView(layout)
        }
    }
}
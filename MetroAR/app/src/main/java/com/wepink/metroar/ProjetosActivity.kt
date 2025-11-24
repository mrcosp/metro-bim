package com.wepink.metroar

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ProjetosActivity : AppCompatActivity() {

    private lateinit var recyclerProjects: RecyclerView
    private val repo = Repository()  // <<< usa o serviço centralizado

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_projetos)

        val btnAddProject = findViewById<ImageButton>(R.id.btnAddProject)
        val btnHome = findViewById<ImageButton>(R.id.btnHome)
        val btnGallery = findViewById<ImageButton>(R.id.btnGallery)

        recyclerProjects = findViewById(R.id.recyclerProjects)

        btnHome.setOnClickListener { finish() }

        btnGallery.setOnClickListener {
            Toast.makeText(this, "Selecione uma pasta para visualizar imagens.", Toast.LENGTH_SHORT).show()
        }

        btnAddProject.setOnClickListener {
            val name = findViewById<EditText>(R.id.inputProjectName).text.toString().trim()

            if (name.isEmpty()) {
                Toast.makeText(this, "Digite um nome para a pasta.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val result = repo.createFolder(name)

                    if (result.isSuccessful) {
                        runOnUiThread {
                            Toast.makeText(this@ProjetosActivity, "Pasta criada!", Toast.LENGTH_SHORT).show()
                            fetchAndDisplayFolders() // atualiza a lista
                        }
                    } else {
                        runOnUiThread {
                            Toast.makeText(
                                this@ProjetosActivity,
                                "Erro: ${result.errorBody()?.string()}",
                                Toast.LENGTH_LONG
                            ).show()                        }
                    }

                } catch (e: Exception) {
                    runOnUiThread {
                        Toast.makeText(this@ProjetosActivity, "Falha ao conectar.", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        fetchAndDisplayFolders()
    }

    private fun fetchAndDisplayFolders() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = repo.fetchFolders()   // <<< usando o repository
                if (response.isSuccessful && response.body() != null) {
                    val folders = response.body()!!
                    runOnUiThread { renderFolders(folders) }
                } else {
                    Log.e("ProjetosActivity", "Erro: ${response.code()}")
                }

            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(
                        this@ProjetosActivity,
                        "Falha ao conectar ao servidor.",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    private fun renderFolders(folders: List<FolderResponse>) {
        recyclerProjects.layoutManager = GridLayoutManager(this, 2)
        recyclerProjects.adapter = FolderAdapter(folders) { folder ->
            val intent = Intent(this, GaleriaActivity::class.java)
            intent.putExtra("folderName", folder.name)
            startActivity(intent)
        }
    }
}
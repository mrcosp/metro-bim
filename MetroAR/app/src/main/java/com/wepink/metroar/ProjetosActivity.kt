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

        val btnHome = findViewById<ImageButton>(R.id.btnHome)
        val btnRefresh = findViewById<ImageButton>(R.id.btnRefresh)

        recyclerProjects = findViewById(R.id.recyclerProjects)

        btnHome.setOnClickListener { finish() }

        btnRefresh.setOnClickListener {
            fetchAndDisplayFolders()
            Toast.makeText(this, "Atualizando…", Toast.LENGTH_SHORT).show()
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
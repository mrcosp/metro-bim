package com.wepink.metroar

import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity

class ProjetosActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_projetos)

        val btnAddProject = findViewById<ImageButton>(R.id.btnAddProject)
        val btnHome = findViewById<ImageButton>(R.id.btnHome)
        val btnGallery = findViewById<ImageButton>(R.id.btnGallery)

        btnAddProject.setOnClickListener {
            // Infla o layout do diálogo
            val dialogView = layoutInflater.inflate(R.layout.dialog_add_project, null)

            // Cria o diálogo
            val dialog = android.app.AlertDialog.Builder(this)
                .setView(dialogView)
                .setCancelable(false)
                .create()

            dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
            dialog.show()

            // Referências dos elementos DENTRO do layout inflado (dialog_add_project.xml)
            val btnClose = dialogView.findViewById<ImageButton>(R.id.btnCloseDialog)
            val btnCreate = dialogView.findViewById<Button>(R.id.btnCreateProject)
            val nameInput = dialogView.findViewById<EditText>(R.id.inputDialogName)
            val dateInput = dialogView.findViewById<EditText>(R.id.inputDialogDate)

            // Fechar o diálogo
            btnClose.setOnClickListener {
                dialog.dismiss()
            }

            // Criar projeto
            btnCreate.setOnClickListener {
                val nome = nameInput.text.toString()
                val data = dateInput.text.toString()

                if (nome.isNotEmpty() && data.isNotEmpty()) {
                    Toast.makeText(this, "Projeto '$nome' criado em $data!", Toast.LENGTH_SHORT).show()
                    dialog.dismiss()
                } else {
                    Toast.makeText(this, "Preencha todos os campos!", Toast.LENGTH_SHORT).show()
                }
            }
        }

        btnHome.setOnClickListener {
            finish() // volta pra tela anterior
        }

        btnGallery.setOnClickListener {
            Toast.makeText(this, "Abrir galeria", Toast.LENGTH_SHORT).show()
        }
    }
}
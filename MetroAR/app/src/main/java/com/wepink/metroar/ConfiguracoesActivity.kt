package com.wepink.metroar

import android.os.Bundle
import android.widget.ImageButton
import android.widget.CheckBox
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class ConfiguracoesActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_configuracoes)

        val homeButton = findViewById<ImageButton>(R.id.home_button)
        val salvarButton = findViewById<Button>(R.id.salvar_button)

        val checkSalvarDireto = findViewById<CheckBox>(R.id.checkSalvarDireto)
        val checkCamera = findViewById<CheckBox>(R.id.checkCamera)
        val checkFlash = findViewById<CheckBox>(R.id.checkFlash)

        // Botão Home → volta para HomeActivity
        homeButton.setOnClickListener {
            finish()
        }

        // Salvar Alterações (depois você decide o que armazenar)
        salvarButton.setOnClickListener {
            // Exemplo de leitura:
            val salvarDireto = checkSalvarDireto.isChecked
            val acessoCamera = checkCamera.isChecked
            val acessoFlash = checkFlash.isChecked

            // Aqui você pode salvar no SharedPreferences se quiser.
        }
    }
}
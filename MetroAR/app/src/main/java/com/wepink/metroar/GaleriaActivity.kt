package com.wepink.metroar

import android.content.Intent
import android.os.Bundle
import android.widget.ImageButton
import androidx.appcompat.app.AppCompatActivity

class GaleriaActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_galeria)

        // Referência ao botão "Home"
        val homeButton = findViewById<ImageButton>(R.id.home_button)

        // Quando clicar, volta para a Home
        homeButton.setOnClickListener {
            val intent = Intent(this, HomeActivity::class.java)
            startActivity(intent)
            finish() // Fecha a tela atual (opcional, deixa o app mais fluido)
        }
    }
}
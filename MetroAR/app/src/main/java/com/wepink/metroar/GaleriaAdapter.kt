package com.wepink.metroar

import android.content.Intent
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.RecyclerView
import java.io.File

data class ImageItem(
    val id: String,
    val base64: String,
    val nome: String,
    val descricao: String,
    val criadoEm: String
)

class GaleriaAdapter(private val items: List<ImageItem>) :
    RecyclerView.Adapter<GaleriaAdapter.ImageViewHolder>() {

    init {
        Log.d("GALERIA_ADAPTER", "🧩 Adapter criado com ${items.size} imagens")
    }

    class ImageViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val img: ImageView = view.findViewById(R.id.imageThumb)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ImageViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_imagem, parent, false)
        return ImageViewHolder(view)
    }

    override fun onBindViewHolder(holder: ImageViewHolder, position: Int) {

        val item = items[position]
        val rawBase64 = item.base64
        val cleanBase64 = rawBase64.substringAfter("base64,", rawBase64)

        try {
            val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            holder.img.setImageBitmap(bitmap)

        } catch (e: Exception) {
            Log.e("GALERIA_ADAPTER", "Erro ao decodificar thumbnail", e)
        }

        holder.itemView.setOnClickListener {
            val context = holder.itemView.context

            try {
                val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)

                val tempFile = File(context.cacheDir, "preview_${System.currentTimeMillis()}.jpg")
                tempFile.writeBytes(decodedBytes)

                val intent = Intent(context, FotoPreviewActivity::class.java)
                intent.putExtra("imagePath", tempFile.absolutePath)
                intent.putExtra("nome", item.nome)
                intent.putExtra("descricao", item.descricao)
                intent.putExtra("criadoEm", item.criadoEm)
                intent.putExtra("imageId", item.id) // IMPORTANTE

                (context as AppCompatActivity).startActivityForResult(intent, 1001)

            } catch (e: Exception) {
                Log.e("GALERIA_ADAPTER", "Erro ao salvar arquivo temporário", e)
            }
        }
    }

    override fun getItemCount(): Int = items.size
}
package com.wepink.metroar

import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide

class GaleriaAdapter(private val images: List<String>) :
    RecyclerView.Adapter<GaleriaAdapter.ImageViewHolder>() {

    init {
        Log.d("GALERIA_ADAPTER", "🧩 Adapter criado com ${images.size} imagens")
    }

    class ImageViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val img: ImageView = view.findViewById(R.id.imageThumb)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ImageViewHolder {
        Log.d("GALERIA_ADAPTER", "📦 Criando ViewHolder...")
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_imagem, parent, false)
        return ImageViewHolder(view)
    }

    override fun onBindViewHolder(holder: ImageViewHolder, position: Int) {
        Log.d(
            "GALERIA_ADAPTER",
            "🔥 onBindViewHolder() posição $position | tamanho lista = ${images.size}"
        )

        val img = images[position]
        Log.d("GALERIA_ADAPTER", "📸 Base64 size=${img.length}")

        Glide.with(holder.itemView)
            .load(img)
            .into(holder.img)
    }

    override fun getItemCount(): Int {
        Log.d("GALERIA_ADAPTER", "📏 getItemCount() retornando ${images.size}")
        return images.size
    }
}
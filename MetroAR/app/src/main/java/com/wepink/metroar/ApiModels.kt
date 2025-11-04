package com.wepink.metroar

import retrofit2.Response
import retrofit2.http.GET

data class FolderResponse(
    val name: String,
    val date: String
)

interface ApiService {
    @GET("/api/folders")
    suspend fun getFolders(): Response<List<FolderResponse>>
}
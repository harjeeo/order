package com.orderdashboard.pos.data.network

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class LoginUser(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val tenantId: String? = null,
)

/**
 * The backend returns one of three shapes from the same endpoint
 * (see order-dashboard-api/src/routes/auth.ts):
 *  - success: { token, user }
 *  - needs a second factor: { requires2FA: true, mfaToken }
 *  - failure: { error } (modeled as an HTTP error, not this class)
 * All fields are optional here and the call site decides which case it got.
 */
@Serializable
data class LoginResponse(
    val token: String? = null,
    val user: LoginUser? = null,
    val requires2FA: Boolean? = null,
    val mfaToken: String? = null,
)

@Serializable
data class ApiErrorBody(val error: String? = null)

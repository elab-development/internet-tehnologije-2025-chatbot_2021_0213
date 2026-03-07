// swagger.js – OpenAPI 3.0 specification (no JSDoc scanning needed)

export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Chatbot API – Studentska služba FON",
    version: "1.0.0",
    description: "REST API za chatbot sistem sa administrativnim panelom za upravljanje bazom pitanja i odgovora."
  },
  servers: [
    { url: "http://localhost:4000", description: "Development" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    },
    schemas: {
      QA: {
        type: "object",
        properties: {
          id:            { type: "integer" },
          question:      { type: "string" },
          answer:        { type: "string" },
          keywords:      { type: "string" },
          category_id:   { type: "integer", nullable: true },
          view_count:    { type: "integer" },
          is_active:     { type: "integer" },
          created_at:    { type: "string" },
          updated_at:    { type: "string" }
        }
      },
      QAInput: {
        type: "object",
        required: ["question", "answer"],
        properties: {
          question:    { type: "string", minLength: 3 },
          answer:      { type: "string", minLength: 1 },
          keywords:    { type: "string" },
          category_id: { type: "integer", nullable: true }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", example: "admin" },
          password: { type: "string", example: "admin123" }
        }
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: {
            type: "object",
            properties: {
              id:       { type: "integer" },
              username: { type: "string" },
              role:     { type: "string", enum: ["admin", "editor", "user"] }
            }
          }
        }
      },
      ChatRequest: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string", example: "Koje je radno vreme?" }
        }
      },
      ChatResponse: {
        type: "object",
        properties: {
          answer:  { type: "string" },
          matched: { type: "object", nullable: true, properties: { id: { type: "integer" }, question: { type: "string" }, score: { type: "number" } } },
          suggestions: { type: "array", items: { type: "object", properties: { id: { type: "integer" }, question: { type: "string" } } } }
        }
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } }
      }
    }
  },
  paths: {
    "/api/health": {
      get: {
        summary: "Health check",
        tags: ["System"],
        responses: { 200: { description: "OK" } }
      }
    },
    "/api/auth/login": {
      post: {
        summary: "Login – dobij JWT token",
        tags: ["Auth"],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
        responses: {
          200: { description: "Token", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          401: { description: "Pogrešni podaci", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
        }
      }
    },
    "/api/auth/register": {
      post: {
        summary: "Registracija novog korisnika",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["username","password"], properties: { username: { type: "string" }, password: { type: "string", minLength: 6 } } } } }
        },
        responses: { 201: { description: "Korisnik kreiran" }, 409: { description: "Korisničko ime već postoji" } }
      }
    },
    "/api/auth/logout": {
      post: {
        summary: "Odjava",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Neautorizovan" } }
      }
    },
    "/api/auth/me": {
      get: {
        summary: "Podaci trenutnog korisnika",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Korisnik" }, 401: { description: "Neautorizovan" } }
      }
    },
    "/api/qa": {
      get: {
        summary: "Lista svih Q&A unosa",
        tags: ["QA"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "category", schema: { type: "integer" } },
          { in: "query", name: "search",   schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Lista", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/QA" } } } } },
          401: { description: "Neautorizovan" },
          403: { description: "Nedovoljne privilegije" }
        }
      },
      post: {
        summary: "Dodaj novi Q&A unos",
        tags: ["QA"],
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/QAInput" } } } },
        responses: { 201: { description: "Kreiran" }, 400: { description: "Validacijska greška" }, 403: { description: "Samo admin/editor" } }
      }
    },
    "/api/qa/{id}": {
      put: {
        summary: "Izmeni Q&A unos",
        tags: ["QA"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/QAInput" } } } },
        responses: { 200: { description: "Izmenjeno" }, 403: { description: "Samo admin/editor" }, 404: { description: "Nije pronađeno" } }
      },
      delete: {
        summary: "Obriši Q&A unos (samo admin)",
        tags: ["QA"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Obrisano" }, 403: { description: "Samo admin" }, 404: { description: "Nije pronađeno" } }
      }
    },
    "/api/categories": {
      get: {
        summary: "Lista kategorija (javno)",
        tags: ["Categories"],
        responses: { 200: { description: "Kategorije" } }
      }
    },
    "/api/chat": {
      post: {
        summary: "Pošalji poruku chatbotu",
        tags: ["Chat"],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ChatRequest" } } } },
        responses: {
          200: { description: "Odgovor", content: { "application/json": { schema: { $ref: "#/components/schemas/ChatResponse" } } } },
          400: { description: "Prazna poruka" },
          429: { description: "Previše zahteva" }
        }
      }
    },
    "/api/chat/stats": {
      get: {
        summary: "Statistike chata (samo admin)",
        tags: ["Chat"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Statistike" }, 403: { description: "Samo admin" } }
      }
    }
  }
};

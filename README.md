# Orizon - Progetto Agenti AI per Sviluppo

Live Demo: in arrivo.

# Descrizione

Orizon è un'applicazione web che aiuta l'utente a comprendere l'impatto ambientale del trasporto dei propri bagagli attraverso una conversazione con un assistente AI.

L'applicazione permette di descrivere un viaggio in linguaggio naturale, indicando origine, destinazione, mezzo di trasporto e peso dei bagagli. L'assistente chiede le informazioni mancanti e utilizza l'API EcoFreight per ottenere una stima delle emissioni.

Il risultato include le emissioni in kg di CO₂e e un riepilogo del viaggio. La stima riguarda i bagagli trattati come carico secondo una metodologia merci e non rappresenta l'impronta complessiva del passeggero.

Le conversazioni vengono salvate per consentire all'utente di riprendere la chat e aggiornare le informazioni già fornite.

# Architettura

Il progetto utilizza un frontend basato su componenti React e un backend Node.js:

Components: chatbot, conversazione, messaggi, campo di scrittura e pulsante di invio.

Services: chat-api.js utilizza Fetch per inviare i messaggi al backend e recuperare la conversazione.

Backend: Express espone l'endpoint /chat e gestisce le richieste del frontend.

AI: agent.js collega Groq (modello GPT-OSS 120B) alla conversazione; system-prompt.js definisce le istruzioni dell'assistente e il tool per richiedere la stima tramite function calling.

API: ecofreight.js chiama EcoFreight per ottenere le emissioni, senza affidare il calcolo al modello AI.

Memoria: memory.js salva i messaggi su Turso (database compatibile con SQLite), mentre il browser conserva l'identificativo della conversazione in localStorage.

# Tecnologie utilizzate:

HTML

CSS

JavaScript

React

Vite

Tailwind CSS

Shadcn React AI Chatbot

Lucide React

Fetch API

Node.js

Express

Groq (modello GPT-OSS 120B) API

EcoFreight API

Turso (compatibile con SQLite)

# HUB OPERACIONAL — TRANSIÇÃO DE ARQUITETURA

## Objetivo

Transformar o chatbot atual em um HUB operacional de atendimento escalável.

## Estrutura Modular

- contacts
- conversations
- messages
- attendants
- queues
- whatsapp

## Fluxo arquitetural

WhatsApp Event
→ Controller
→ Service
→ Repository
→ Database
→ Websocket
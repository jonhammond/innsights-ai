# AGENTS.md

## Project

## Boundaries

## Stack

## Core

## Design

## **Always:**

- Run linting and tests before committing
- List only human authors in git commits

## ⚠️ **Ask First:**

- Before making database changes (schema, RLS policies, Supabase Functions)
- Before pushing database changes

## ❌ **Never:**

- Force push to main
- Use `supabase db push`
- Use `supabase db reset`
- Commit secrets or .env files to the repository

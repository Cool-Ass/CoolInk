# Rejestr wydań i rollback

## 2026-09-30 — bootstrap Autopilot v1 (dokumentacja)

- Baza: `56fe9a3151b2a339f76b94cae85dd66dc15a4ac6`; branch `ai/autopilot-v1`.
- Zakres: osiem nowych plików Markdown; bez zmian aplikacji, workflow i danych.
- Zgoda: jawne zlecenie właściciela na dodanie i push dokumentacji; ADR-001.
- Identyfikator commitu: commit dodający ten wpis, widoczny w historii Git.
- Walidacja: PASS — kontrola diff/whitespace, dokładnie osiem nowych plików
  Markdown i wszystkie lokalne linki. CI nowego SHA sprawdzane osobno.
- Deployment aplikacji / production smoke: nie wykonano w bootstrapie.
- Rollback: revert commitu dokumentacyjnego; nie wymaga restore bazy.

## Potwierdzone informacje historyczne (nie nowe wdrożenia)

- PR #16 / `56fe9a3`: uprawnienia kalendarza i archiwalne rezerwacje.
  [Quality and security zakończone success](https://github.com/Cool-Ass/CoolInk/actions/runs/36642707311).
- PR #15 / `fd23140`: porównywanie liczby rekordów niezależnie od collation.
- PR #14 / `1390d74`: tooling PostgreSQL 17 i korekty backup/restore.
- [Backup success](https://github.com/Cool-Ass/CoolInk/actions/runs/36552750345)
  dla `fd23140`; nie dowodzi dzisiejszej świeżości ani udanego restore drill.

Każde następne wydanie: data UTC, zadanie/ryzyko, commit/PR, zgoda, wszystkie
CI/E2E/security run URL, backup gate (lub uzasadnione N/A), deployment ID/URL,
poprzednia wersja, smoke i obserwacja, wynik, rollback (czas, powód, wersja,
wynik ponownego smoke), link do incydentu. Bez dowodu oznacz UNKNOWN/PENDING.

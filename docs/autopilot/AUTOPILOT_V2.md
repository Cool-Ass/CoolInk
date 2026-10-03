# CoolInk Autopilot v2 — Clef i OpenShell

## Co jest wdrożone w kodzie

Router wybiera spośród `ANALYZE`, `FIX`, `TEST`, `SECURITY_AUDIT`, `WAIT`,
`ESCALATE`. Stan ogranicza zestaw decyzji **przed** wywołaniem modelu. Clef nie
może udzielić zgody na zmianę uprawnień, merge ani deploy. Ryzyko MEDIUM/HIGH,
nieznane ryzyko, incydent lub blokada kierują do eskalacji. Aktywna praca oznacza
WAIT. Brak dostępu do Clef, timeout, obcy format lub pewność poniżej 0,85 blokują
wykonanie; nie ma cichego przejścia do innego modelu wykonującego zmiany.

| Element | Implementacja | Stan operacyjny |
|---|---|---|
| Router | `scripts/autopilot/router.mjs` | rules bez kosztu; Clef przez Workers AI po podaniu credentiali |
| Runner hosta | `scripts/autopilot/cli.mjs` | plan domyślny; run wyłącznie przez OpenShell |
| Worker | `scripts/autopilot/worker.cjs` | OpenCode wewnątrz obrazu z Node 22 |
| Polityka | `config/autopilot/openshell-policy.yaml` | Landlock wymagany; zamknięta sieć poza rejestrem npm/Prisma oraz providerem inference |
| Scheduler | `.github/workflows/autopilot-plan.yml` | samo planowanie; po merge do domyślnego brancha, bez sekretów i uruchamiania agenta |
| Historia | `.autopilot/history.jsonl` | lokalne decyzje i wyniki; w planującym CI artefakt 14 dni |
| Przekazanie zmiany | `.autopilot/<runId>/result.patch` i `result.json` | niezaufany wynik do przeglądu, bez auto-apply/push/merge |

Kod nie aktywuje hosta Windows/WSL, providera, subskrypcji Cloudflare ani
ustawień hostingu. Nie wykonano rzeczywistego wywołania Clef ani live smoke
OpenShell w środowisku tworzenia PR: brak skonfigurowanego runtime i credentiali.
Nie oznacza to działającego produkcyjnego Autopilota.

## Uruchomienie próbne

Wymagany Node 22. Bez instalowania zależności aplikacji:

```bash
node scripts/autopilot/cli.mjs plan config/autopilot/state.example.json rules
```

Stan przykładowy celowo ma nieznane ryzyko i brak wybranego zadania. Wynik
`ESCALATE` oznacza brak zaufanego zadania do wykonania. Scheduler sprawdza
mechanizm planowania i zapis historii; nie wybiera sam zadania z backlogu.
Harmonogram UTC: 00:13, 05:13, 10:13, 15:13, 20:13. Przerwy wynoszą 5 godzin,
poza 4 godzinami przez północ. GitHub cron nie gwarantuje dokładnej godziny
wykonania. Nie służy do omijania limitu modelu; uruchomienie to nowy plan.

Dla jednego ocenionego zadania przygotuj lokalny `.autopilot/state.json`:

```json
{
  "schemaVersion": 1,
  "taskId": "AP-004",
  "risk": "LOW",
  "phase": "READY",
  "checks": "UNKNOWN",
  "workInProgress": false,
  "securityFinding": false
}
```

Przykład AP-004 jest aktualny wyłącznie, jeśli nadal ma LOW/TODO w backlogu.
Runner i worker nie mogą pracować jednocześnie z inną sesją CoolInk. Lokalny
mutex chroni jeden checkout; nie zastępuje globalnej blokady wielu maszyn ani
innych Workerów. Wymagana jedna dedykowana maszyna wykonawcza do czasu AP-001.
Plik JSON jest wejściem zaufanego operatora, nie modelem oceny ryzyka diffu.

## Clef

Ustaw wyłącznie na hoście `CLOUDFLARE_ACCOUNT_ID` i `CLOUDFLARE_API_TOKEN`
(uprawnienie Workers AI dla właściwego konta), a następnie:

```bash
node scripts/autopilot/cli.mjs plan .autopilot/state.json clef
```

Wysyłane są tylko task ID, ryzyko, faza i flagi. Nie wysyłamy kodu, opisów
issues, historii rozmów, danych klientów ani logów. Nazwy kont/sekrety nie
trafiają do historii. Provider jest wywoływany najwyżej raz na cykl, bez retry.
Otwarte wagi nie oznaczają bezpłatnej usługi: Workers AI podlega aktualnym
limitom i cennikowi. Bez credentiali dostępny pozostaje bezpłatny router rules,
który dla gotowego zadania wybiera analizę, nigdy automatyczną poprawkę.

Weryfikowany kontrakt: REST `/ai/run/@cf/cloudflare/clef-flash`, pytanie `choice`,
odpowiedź `result.answers.action.choice` oraz `.confidence`. Odpowiedź niezgodna
z kontraktem oznacza eskalację i wymaga aktualizacji adaptera po inspekcji API.

## OpenShell i uruchomienie agenta

Adapter odpowiada źródłom **OpenShell v0.1.2**, commit
`6648bd0c290efbc41ba131ee9831ee45cd431f94`. Inne wersje wymagają ponownego
sprawdzenia CLI/polityki. Windows wymaga hosta WSL2/Linux z kompatybilnym
runtime OpenShell i Landlock. Sam Docker nie potwierdza izolacji: brak
Landlock zatrzymuje sandbox (`hard_requirement`).

Przed pierwszym `run` administrator hosta musi skonfigurować:

1. OpenShell v0.1.2 i gateway. Użyć oficjalnej instalacji oraz testu sandboxa;
   nie pobierać instalatorów przez ten runner.
2. Zaufany obraz wskazany immutable digestem. Musi zawierać Node 22 pod
   `/usr/local/bin/node`, OpenCode pod `/usr/local/bin/opencode`, npm, git,
   tar, CA i pusty zapisywalny `/sandbox` jako kanoniczny WORKDIR.
   Bez prywatnych konfiguracji, tokenów, deployment CLI i katalogu hosta.
   Rozmiar obrazu i agent należy zatwierdzić poza tym pakietem.
3. Provider `coolink-inference` na bazie sprawdzonego profilu OpenRouter,
   z endpointem `openrouter.ai:443` przypisanym wyłącznie do OpenCode.
   Bez providerów GitHub/Supabase/Vercel. Klucz przechowuje gateway; nie
   przekazywać go przez `--env`, pliki ani snapshot repo.
4. Testowy sandbox z tym samym obrazem, providerem i polityką. Sprawdzić
   **efektywną** politykę (provider może ją rozszerzyć), a potem zapisać SHA256
   dokładnego wyjścia `openshell sandbox get NAME --policy-only` jako
   `AUTOPILOT_POLICY_SHA256`. Nie zatwierdzać automatycznie nieznanego hasha.
   Zmiana polityki/providera/gateway wymaga ponownego przeglądu.
5. Zablokować modyfikowanie polityk i providerów przez agenta; admin gateway
   pozostaje poza sandboxem. Nie używać `--approval-mode auto`.
6. Potwierdzić próby odmowy: produkcyjna domena, Supabase, Vercel, GitHub push,
   dostęp do hostowych plików i credentiali. Zanotować wersję/obraz/hash/wynik.

Wymagane zmienne hosta:

| Zmienna | Wartość |
|---|---|
| AUTOPILOT_IMAGE | zatwierdzony `registry/image@sha256:<64 hex>` |
| AUTOPILOT_PROVIDER | dokładnie `coolink-inference` |
| AUTOPILOT_POLICY_SHA256 | zatwierdzony SHA256 efektywnej polityki |
| AUTOPILOT_MODEL | istniejący model OpenCode w formie `openrouter/…` |

Potem na czystym branchu `ai/*` z zapisanym commitem:

```bash
node scripts/autopilot/cli.mjs run .autopilot/state.json rules
# Po potwierdzeniu kontraktu żywego Clef:
node scripts/autopilot/cli.mjs run .autopilot/state.json clef
```

Runner tworzy sandbox, porównuje politykę, przesyła snapshot **commitu**,
wykonuje worker i pobiera patch/raport do osobnego katalogu. Nie przesyła
hostowego `.git`, `.env`, `.autopilot`, niezacommitowanych plików ani credentiali.
Przez `--env` przekazuje tylko niesekretne ścieżki XDG i cache npm do `/sandbox`.
Symlinki i podejrzane tracked env/klucze/dumpy blokują snapshot; `.env.example`
pozostaje dozwolonym publicznym szablonem. Zasada zakazu sekretów w repo nadal
obowiązuje. Snapshot publicznego repo nie zastępuje skanera sekretów.

Worker wymaga zgodnego LOW/TODO w backlogu. Instaluje zależności, uruchamia
OpenCode, a następnie typecheck, testy, lint, build i audit zależności.
Brak środowiska builda lub niezgodna sieć powodują FAIL; nie zastępować ich
credentialami produkcji. Raport sandboxa jest niezaufany, **nie stanowi**
dowodu CI/security/E2E ani zgody na promocję. Nowe pliki też trafiają do patcha.
Analiza/test/audit zlecają agentowi pozostawienie kodu bez zmian; patch i tak
musi przejść przegląd. Próba modyfikacji chronionych plików wymaga odrzucenia.

Nie ma integracji Codexa z sandboxem w tej wersji. Adapter wykonawczy jest
konkretnie dla OpenCode; Codex może później być osobnym zweryfikowanym adapterem.

## Awarie i przekazanie do PR

- Istniejący `.autopilot/worker.lock` blokuje kolejny start. Po awarii sprawdzić
  PID, sandboxy, otwarte PR i inne hosty; dopiero potem ręcznie usunąć blokadę.
  Nie przejmujemy wygasłego mutexa automatycznie.
- Przed sandboxem zapisujemy decyzję i base SHA. Zakończenie też trafia do
  historii. Timeout nie uruchamia ponownie tej samej zmiany.
- Cleanup usuwa tylko sandbox o unikalnym ID tego runu. Brak potwierdzonego
  usunięcia oznacza BLOCKED i ręczną inspekcję runtime.
- Otworzyć patch jako dane i sprawdzić ścieżki/diff. Nie wykonywać go jako skryptu.
  Osobny zaufany proces zastosuje dopiero zaakceptowane fragmenty na branchu,
  utworzy PR i uruchomi istniejące CI oraz brakujące bramki E2E/staging.
- Żaden wynik tego runnera nie publikuje produkcji. Obowiązują zasady v1,
  w szczególności AP-001, exact-SHA checks, backup oraz release gates.

Rollback pakietu v2: revert plików tego PR i wyłączenie workflow planowania.
Nie wymaga zmian bazy ani przywracania danych. Po aktywacji runtime osobno
usunąć pozostałe sandboxy oraz provider tylko wtedy, gdy nie używa go inna praca.

## Źródła

- [Cloudflare Clef — ogłoszenie i kontrakt](https://developers.cloudflare.com/changelog/post/2026-10-01-clef-workers-ai/)
- [Clef-flash — REST i parametry](https://developers.cloudflare.com/workers-ai/models/clef-flash/)
- [OpenShell v0.1.2 — CLI i sandbox](https://github.com/NVIDIA/OpenShell/blob/v0.1.2/docs/how-it-works/sandboxes/overview.mdx)
- [OpenShell v0.1.2 — polityka](https://github.com/NVIDIA/OpenShell/blob/v0.1.2/docs/how-it-works/policies/schema.mdx)
- [OpenShell v0.1.2 — profil OpenRouter](https://github.com/NVIDIA/OpenShell/blob/v0.1.2/providers/openrouter.yaml)

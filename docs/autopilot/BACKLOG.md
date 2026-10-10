# Backlog Autopilota

Stan na 2026-09-30; baza `56fe9a3`. Właściciel decyzji: właściciel CoolInk.
P0 = aktywna awaria/utrata danych; P1 = bezpieczeństwo i blokady wydania;
P2 = utrzymanie/UX; P3 = przyszłe pomysły. Priorytet nie określa ryzyka.
Status zadania: TODO, IN_PROGRESS, WAITING_APPROVAL, BLOCKED, DONE.

| ID | Priorytet | Ryzyko | Status | Zadanie / kryterium odbioru |
|---|---|---|---|---|
| STUDIO-WORKSPACE-20261010 | P2 | MEDIUM | IN_PROGRESS | Pozostały zatwierdzony kierunek Studio: tydzień, drawer obsługi, finanse, kontekst klienta, następna czynność i spójny UI. Exact CI/E2E/security i ręczna publikacja. |
| STUDIO-WORKFLOW-20261010 | P2 | MEDIUM | IN_PROGRESS | Zatwierdzone kategorie i daty kolejki, health w ustawieniach, masonry i wspólny boczny panel. Exact CI/E2E i ręczna promocja wymagane. Bez migracji/reguł płatności. |
| OPERATIONAL-ALERTS-20261009 | P1 | MEDIUM | DONE | PR45 main413ca66 opublikowany01:36UTC; exact-head/main verify/backup/CodeQL i Vercel SUCCESS, ponad15min obserwacji Error0%/Timeout0%, smoke200/401. Alarmy po sukcesie, recovery limit2h, fixed-code diagnostics, Next16.3.8. Bez migracji/sekretów/harmonogramów. |
| GOOGLE-EXPORT-20261009 | P1 | HIGH przy OAuth/sekretach | TODO | Istniejący EXPORT_FAILED1/queue1 pozostaje. PR45 poprawia diagnostykę, nie przyczynę503. Ustalić fixed-code następnego worker run; nie deklarować invalid_grant bez dowodu ani wykonywać OAuth/sekretów/produkcji sync bez właściwej zgody. |
| TEXT-GROUP-20261006 | P2 | MEDIUM | DONE | PR40: obrys/cień w Tekst, overlay obrazu i alpha widgetu. Exact gates PASS, ad434aa opublikowany, smoke i świeże15min metryki PASS. |
| ANNOUNCEMENT-RICH-20261007 | P2 | MEDIUM | WAITING_APPROVAL | Formatowanie tekstowe,32 emoji,4 obrazy publicznej biblioteki; upload/picker/preview, alt, media usage i bez HTML execution. Unit11/types/lint PASS, E2E wymagane. Security gate sharp0.35.4 wymaga zatwierdzenia patch0.35.5 i całego pakietu. Rollback fe857c0 bez restore. |
| LOYALTY-HEADER-20261006 | P2 | MEDIUM | WAITING_APPROVAL | PR42 kółka przy nazwie klienta; UI-only, typy/lint PASS. CI37537167381 zablokowany nowym advisory sharp; zgoda wymagana na patch zależności przed publikacją. |
| ANNOUNCEMENTS-CMS-20261006 | P2 | MEDIUM | DONE | PR41 fe857c0 opublikowany07:44UTC, exact-head/main CI i ponad15min smoke/obserwacji PASS. Dowody PR41 comment6012028861 oraz docs-only27a4992. |
| UX-20261005 | P2 | MEDIUM | DONE | PR39, main8a9431e, CI37388586456 SUCCESS; ręczna promocja fLYEoVMDMxwLS9B7iDeRuSJDdJAX, ponad15min smoke/obserwacji PASS. Wspólny kompaktowy inspector, globalne style, prowadnice px/drag/kąt/duplikacja, sesje malejąco i wspólne rozliczenie. UI-only, zatwierdzone przez właściciela. |
| AP-001 | P1 | HIGH | TODO | Zweryfikować ochronę main, wyłączność Workera, hosting i gate CI/E2E/security. Dowody dla jednego SHA, lista E2E i brak promocji przed checks; zmiany ustawień dopiero po zgodzie. |
| AP-002 | P1 | LOW (odczyt) | TODO | Potwierdzić najnowszy restore drill, kompletność backupu i plan odtworzenia. Run URL, środowisko, data i wynik; brak dowodu blokuje zmiany danych. |
| AP-003 | P1 | LOW (weryfikacja izolowana) | TODO | Zweryfikować regresje po PR #16: RBAC kalendarza, archiwalne rezerwacje, wymagane integration credentials. Dowody testów powiązane z SHA; naprawy auth/danych wymagają HIGH. |
| AP-004 | P2 | LOW | TODO | Uzgodnić README z backup.yml: README mówi o tygodniowym backupie, workflow jest codzienny; poprawić opis db:push/prisma/dev.db wobec PostgreSQL. Odbiór: zgodność ze źródłami bez zmian działania. |
| AP-005 | P2 | LOW (odczyt) | TODO | Potwierdzić konfigurację i historię harmonogramu Worker co 5 h. Dowód uruchomienia, prompt czytający zasady i kontrola nakładania uruchomień. |
| AP-006 | P2 | LOW (odczyt) | TODO | Pierwszy pełny audit i market watch do 2026-10-07 według szablonów. |
| AP-007 | P3 | MEDIUM, ponowna ocena przed realizacją | BLOCKED | AI i publikacja social pozostają odroczone zgodnie z decyzją roadmapy 2026-09-12; wymagają nowej decyzji właściciela. |

Brak potwierdzonego otwartego P0 w tej inspekcji. Nie jest to raport zdrowia
produkcji. Naprawy z PR #14, #15, #16 są już na main; nie otwieraj ich ponownie
bez reprodukcji. Nowe zadanie musi mieć źródło, zakres, właściciela/run,
branch/PR, zależności, kryterium odbioru, walidację i rollback.

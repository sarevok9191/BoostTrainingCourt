import { createContext, useContext, useState } from "react";

const LanguageContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
//  Translations
// ─────────────────────────────────────────────────────────────────────────────
const translations = {
  tr: {
    // Navigation
    home:             "Ana Sayfa",
    schedule:         "Program",
    trainees:         "Danışanlar",
    trainers:         "Eğitmenler",
    history:          "Geçmiş",
    more:             "Daha Fazla",
    signOut:          "Çıkış Yap",

    // Auth
    signIn:                "Giriş Yap",
    signInSub:             "Hesabınıza giriş yapın",
    email:                 "E-posta",
    password:              "Şifre",
    signingIn:             "Giriş yapılıyor…",
    signInError:           "Giriş başarısız.",
    accessDenied:          "Erişim Reddedildi",
    youDontHavePermission: "Bu sayfayı görüntüleme izniniz yok.",
    backToLogin:           "Girişe Dön",

    // Greetings / dashboard
    dashboard:      "Panel",
    goodMorning:    "Günaydın",
    goodAfternoon:  "İyi günler",
    goodEvening:    "İyi akşamlar",
    welcomeBack:    "Tekrar hoş geldiniz,",

    // Stats
    myTrainees:        "Danışanlarım",
    totalTrainers:     "Toplam Eğitmen",
    totalTrainees:     "Toplam Danışan",
    activeAccounts:    "Aktif Hesap",
    traineesPerTrainer:"Danışan / Eğitmen",
    mySessionsLabel:   "Seanslarım",
    completedLabel:    "Tamamlandı",
    todayLabel:        "Bugün",
    upcomingLabel:     "Yaklaşan",
    totalLabel:        "Toplam",
    thisWeekLabel:     "Bu Hafta",

    // Schedule
    todaysSessions:        "Bugünün Seansları",
    noSessionsToday:       "Bugün seans yok.",
    noSessionsOnThisDay:   "Bu günde seans yok.",
    addSession:            "+ Seans Ekle",
    allTrainers:           "Tümü",
    me:                    "Ben",
    today:                 "Bugün",

    // Session type
    gymBadge:    "🏋️ Salon",
    homeBadge:   "🏠 Ev",
    gym:         "Salon",
    home:        "Ev",
    sessionType: "Seans Tipi",
    noCreditDeduction: "Ev seansı — kredi düşülmez",

    // Session card actions
    markComplete:    "✓ Tamamla",
    deleteSession:   "✕",
    editNotes:       "✏ Notları Düzenle",
    done:            "✓ Bitti",
    sessionCompleted:"✓ Tamamlandı",
    otherTrainer:    "Diğer Eğitmen",

    // Session form
    selectTrainee:        "— Danışan seçin —",
    date:                 "Tarih",
    time:                 "Saat",
    addExercise:          "+ Egzersiz Ekle",
    movement:             "Hareket",
    sets:                 "Set",
    repsLabel:            "Tekrar",
    timeLabel:            "Süre",
    weightOptional:       "Ağırlık (kg)",
    sessionNotesLabel:    "Seans Notları",
    sessionNotesPlaceholder: "Bu seans hakkında genel notlar…",
    saveSession:          "Seans Ekle",
    cancel:               "İptal",
    saving:               "Kaydediliyor…",
    optional:             "opsiyonel",

    // Complete modal
    creditsLabel:            "Krediler",
    lowCredit:               "⚠ Düşük",
    confirmCompleteSession:  "✓ Seansı Tamamla",
    confirmSessionWith:      "tarihindeki seansı tamamlamak istediğinize emin misiniz?",

    // Trainees tab
    noTraineesYet:    "Henüz danışan yok.",
    addTrainee:       "+ Danışan Ekle",
    removeTrainee:    "Kaldır",
    credits:          "Kredi",
    sessions:         "Seans",
    name:             "Ad",
    emailLabel:       "E-posta",
    trainer:          "Eğitmen",
    showPassword:     "Göster",
    hidePassword:     "Gizle",
    topUp:            "+ Yükle",
    confirmTopUp:     "Onayla",
    creditsToAdd:     "Eklenecek Kredi",
    declaredPassword: "Şifre",
    backToTrainees:   "Danışanlara Dön",
    noSessionsYet:    "Bu danışan için henüz seans yok.",
    tapToViewEdit:    "Görüntüle / düzenle için dokun",
    tapToView:        "Görüntülemek için dokun",
    sessionsTab:      "Seanslar",
    progressTab:      "İlerleme",

    // Add trainee / trainer form
    fullName:         "Ad Soyad",
    emailOptional:    "E-posta",
    passwordLabel:    "Şifre",
    startingCredits:  "Başlangıç Kredisi",
    creating:         "Oluşturuluyor…",
    createTrainee:    "Danışan Oluştur",
    addNewTrainer:    "Yeni Eğitmen Ekle",
    addNewTrainee:    "Yeni Danışan Ekle",
    createTrainer:    "Eğitmen Oluştur",
    minChars:         "Min. 6 karakter",
    addTrainer:       "+ Eğitmen Ekle",

    // Progress sub-tabs
    weight:           "Kilo",
    bodyMeasurements: "Vücut",
    exercise:         "Egzersiz",
    custom:           "Özel",
    notes:            "Notlar",

    // Progress actions
    logWeight:        "+ Kilo Kaydet",
    logMeasurements:  "+ Ölçüm Kaydet",
    addNote:          "+ Not Ekle",
    defineMetric:     "+ Metrik Tanımla",
    metricName:       "Metrik Adı",
    unit:             "Birim",
    noEntriesYet:     "Henüz kayıt yok.",
    selectExercise:   "— Egzersiz seçin —",
    noExerciseData:   "Henüz egzersiz verisi yok.",
    addValue:         "+ Değer",
    save:             "Kaydet",

    // Measurements
    chest: "Göğüs",
    waist: "Bel",
    hip:   "Kalça",
    arm:   "Kol",
    leg:   "Bacak",

    // Progress panel empty states
    noWeightEntries:       "Henüz kilo kaydı yok.",
    noMeasurements:        "Henüz vücut ölçümü yok.",
    noExerciseDataComplete:"Henüz egzersiz verisi yok. İlerlemeyi görmek için egzersiz bloğu içeren seansları tamamlayın.",
    noCustomMetrics:       "Takip etmeye başlamak için özel bir metrik tanımlayın.",
    noCustomMetricsTrainee:"Henüz özel metrik yok.",
    noPersonalNotes:       "Henüz kişisel not yok. Seanslar sonrası nasıl hissettiğinizi ekleyin!",
    noPersonalNotesTrainer:"Danışan henüz kişisel not eklemedi.",
    howDidYouFeel:         "Nasıl hissettiniz?",
    feelingPlaceholder:    "Enerji, motivasyon, ruh hali…",
    energyLevel:           "Enerji Seviyesi",
    sleep:                 "Uyku",
    energyPlaceholder:     "Örn. Yüksek, 7/10",
    sleepPlaceholder:      "Örn. 8s, kötü",
    saveNote:              "Not Kaydet",

    // ExerciseBlockForm
    exerciseNum:         "Egzersiz",
    movementPlaceholder: "Örn. Bench Press, Squat, Pull-up…",
    setsPlaceholder:     "3",
    repsPlaceholder:     "10",
    durationPlaceholder: "30",
    noExerciseNotes:     "Kayıtlı egzersiz notu yok.",

    // Session detail modal
    saveNotes:    "Notları Kaydet",
    close:        "Kapat",

    // Session history
    upcomingSessions:    "Yaklaşan Seanslar",
    completedSessions:   "Tamamlanan Seanslar",
    pastSessions:        "Geçmiş Seanslar",
    noSessionHistoryYet: "Henüz seans geçmişi yok.",
    withTrainer:         "ile",
    training:            "Antrenman",

    // Super admin
    trainerOverview:          "Eğitmen Genel Bakış",
    deleteTrainer:            "Eğitmeni Sil",
    permanentDeleteWarning:   "Firestore profili ve tüm veriler silinecek.",
    deleteTrainerWarning:     "Bu eğitmenin {count} danışanı var. Bunların tüm seans verileri, ilerleme kayıtları ve hesapları da kalıcı olarak silinecek.",
    deleteTrainerConfirmCheck:"Tüm danışanların da kalıcı olarak silineceğini anlıyorum",
    allTrainees:              "Tüm Danışanlar",
    noTrainersYet:            "Henüz eğitmen yok. İlk eğitmeninizi ekleyin.",
    noTraineesYetAdmin:       "Henüz danışan yok.",
    traineesCol:              "Danışanlar",
    createdCol:               "Oluşturulma",

    // Roles
    superAdminRole: "Süper Yönetici",
    trainerRole:    "Eğitmen",
    traineeRole:    "Danışan",
    superAdmin:     "Süper Yönetici",

    // General
    confirm:      "Onayla",
    delete:       "Sil",
    remove:       "Kaldır",
    error:        "Hata",
    loading:      "Yükleniyor…",
    noDataYet:    "Henüz veri yok.",
    deleting:     "Siliniyor…",
    removing:     "Kaldırılıyor…",

    // Onboarding
    allSet:                 "Hazırsınız!",
    trainerWillSchedule:    "Eğitmeniniz yakında ilk seansınızı planlayacak.",
    startingCreditsLabel:   "Başlangıç Kredisi",
    comeBackHint:           "Program, seans geçmişi ve ilerlemenizi görmek için buraya gelin.",

    // Credit
    creditBalance:   "Kredi Bakiyesi",
    myProgress:      "İlerlemem",

    // Remove/delete confirm text
    removeTraineeConfirmTitle: "Danışanı Kaldır",
    removeTraineeConfirmSub:   "Profil, seanslar ve ilerleme verileri silinecek.",
    deleteSessionTitle:        "Seans Sil",

    // LineChart
    latest: "Son",
  },

  en: {
    // Navigation
    home:     "Home",
    schedule: "Schedule",
    trainees: "Trainees",
    trainers: "Trainers",
    history:  "History",
    more:     "More",
    signOut:  "Sign Out",

    // Auth
    signIn:                "Sign In",
    signInSub:             "Sign in to your account",
    email:                 "Email",
    password:              "Password",
    signingIn:             "Signing in…",
    signInError:           "Failed to sign in.",
    accessDenied:          "Access Denied",
    youDontHavePermission: "You don't have permission to view this page.",
    backToLogin:           "Back to Login",

    // Greetings / dashboard
    dashboard:     "Dashboard",
    goodMorning:   "Good morning",
    goodAfternoon: "Good afternoon",
    goodEvening:   "Good evening",
    welcomeBack:   "Welcome back,",

    // Stats
    myTrainees:         "My Trainees",
    totalTrainers:      "Total Trainers",
    totalTrainees:      "Total Trainees",
    activeAccounts:     "Active Accounts",
    traineesPerTrainer: "Trainees / Trainer",
    mySessionsLabel:    "My Sessions",
    completedLabel:     "Completed",
    todayLabel:         "Today",
    upcomingLabel:      "Upcoming",
    totalLabel:         "Total",
    thisWeekLabel:      "This Week",

    // Schedule
    todaysSessions:      "Today's Sessions",
    noSessionsToday:     "No sessions scheduled for today.",
    noSessionsOnThisDay: "No sessions on this day.",
    addSession:          "+ Add Session",
    allTrainers:         "All",
    me:                  "Me",
    today:               "Today",

    // Session type
    gymBadge:    "🏋️ Gym",
    homeBadge:   "🏠 Home",
    gym:         "Gym",
    home:        "Home",
    sessionType: "Session Type",
    noCreditDeduction: "Home workout — no credit deduction",

    // Session card actions
    markComplete:     "✓ Complete",
    deleteSession:    "✕",
    editNotes:        "✏ Edit Notes",
    done:             "✓ Done",
    sessionCompleted: "✓ Completed",
    otherTrainer:     "Other Trainer",

    // Session form
    selectTrainee:           "— Select trainee —",
    date:                    "Date",
    time:                    "Time",
    addExercise:             "+ Add Exercise",
    movement:                "Movement",
    sets:                    "Sets",
    repsLabel:               "Reps",
    timeLabel:               "Time",
    weightOptional:          "Weight (kg)",
    sessionNotesLabel:       "Session Notes",
    sessionNotesPlaceholder: "General notes about this session…",
    saveSession:             "Add Session",
    cancel:                  "Cancel",
    saving:                  "Saving…",
    optional:                "optional",

    // Complete modal
    creditsLabel:           "Credits",
    lowCredit:              "⚠ Low",
    confirmCompleteSession: "✓ Mark Complete",
    confirmSessionWith:     "Confirm session is done?",

    // Trainees tab
    noTraineesYet:    "No trainees yet.",
    addTrainee:       "+ Add Trainee",
    removeTrainee:    "Remove",
    credits:          "Credits",
    sessions:         "Sessions",
    name:             "Name",
    emailLabel:       "Email",
    trainer:          "Trainer",
    showPassword:     "Show",
    hidePassword:     "Hide",
    topUp:            "+ Top Up",
    confirmTopUp:     "Confirm",
    creditsToAdd:     "Credits to Add",
    declaredPassword: "Password",
    backToTrainees:   "Back to Trainees",
    noSessionsYet:    "No sessions yet for this trainee.",
    tapToViewEdit:    "Tap to view / edit notes",
    tapToView:        "Tap to view session",
    sessionsTab:      "Sessions",
    progressTab:      "Progress",

    // Add trainee / trainer form
    fullName:        "Full Name",
    emailOptional:   "Email",
    passwordLabel:   "Password",
    startingCredits: "Starting Credits",
    creating:        "Creating…",
    createTrainee:   "Create Trainee",
    addNewTrainer:   "Add New Trainer",
    addNewTrainee:   "Add New Trainee",
    createTrainer:   "Create Trainer",
    minChars:        "Min. 6 characters",
    addTrainer:      "+ Add Trainer",

    // Progress sub-tabs
    weight:           "Weight",
    bodyMeasurements: "Body",
    exercise:         "Exercise",
    custom:           "Custom",
    notes:            "Notes",

    // Progress actions
    logWeight:       "+ Log Weight",
    logMeasurements: "+ Log Measurements",
    addNote:         "+ Add Note",
    defineMetric:    "+ Define Metric",
    metricName:      "Metric Name",
    unit:            "Unit",
    noEntriesYet:    "No entries yet.",
    selectExercise:  "— Choose exercise —",
    noExerciseData:  "No exercise data yet.",
    addValue:        "+ Value",
    save:            "Save",

    // Measurements
    chest: "Chest",
    waist: "Waist",
    hip:   "Hip",
    arm:   "Arm",
    leg:   "Leg",

    // Progress panel empty states
    noWeightEntries:        "No weight entries yet.",
    noMeasurements:         "No body measurements yet.",
    noExerciseDataComplete: "No exercise data yet. Complete sessions with exercise blocks to see progression.",
    noCustomMetrics:        "Define a custom metric to start tracking.",
    noCustomMetricsTrainee: "No custom metrics yet.",
    noPersonalNotes:        "No personal notes yet. Add how you feel after sessions!",
    noPersonalNotesTrainer: "Trainee hasn't added any personal notes yet.",
    howDidYouFeel:          "How did you feel?",
    feelingPlaceholder:     "Energy, mood, motivation…",
    energyLevel:            "Energy Level",
    sleep:                  "Sleep",
    energyPlaceholder:      "e.g. High, 7/10",
    sleepPlaceholder:       "e.g. 8h, poor",
    saveNote:               "Save Note",

    // ExerciseBlockForm
    exerciseNum:         "Exercise",
    movementPlaceholder: "e.g. Bench Press, Squat, Pull-up…",
    setsPlaceholder:     "3",
    repsPlaceholder:     "10",
    durationPlaceholder: "30",
    noExerciseNotes:     "No exercise notes recorded.",

    // Session detail modal
    saveNotes: "Save Notes",
    close:     "Close",

    // Session history
    upcomingSessions:    "Upcoming Sessions",
    completedSessions:   "Completed Sessions",
    pastSessions:        "Past Sessions",
    noSessionHistoryYet: "No session history yet.",
    withTrainer:         "with",
    training:            "Training",

    // Super admin
    trainerOverview:          "Trainer Overview",
    deleteTrainer:            "Delete Trainer",
    permanentDeleteWarning:   "Their Firestore profile and all data will be removed.",
    deleteTrainerWarning:     "This trainer has {count} trainee(s). They will also be permanently deleted: sessions, progress data and accounts.",
    deleteTrainerConfirmCheck:"I understand all trainees will also be permanently deleted",
    allTrainees:              "All Trainees",
    noTrainersYet:            "No trainers yet. Add your first trainer.",
    noTraineesYetAdmin:       "No trainees yet.",
    traineesCol:              "Trainees",
    createdCol:               "Created",

    // Roles
    superAdminRole: "Super Admin",
    trainerRole:    "Trainer",
    traineeRole:    "Trainee",
    superAdmin:     "Super Administrator",

    // General
    confirm:   "Confirm",
    delete:    "Delete",
    remove:    "Remove",
    error:     "Error",
    loading:   "Loading…",
    noDataYet: "No data yet.",
    deleting:  "Deleting…",
    removing:  "Removing…",

    // Onboarding
    allSet:               "You're all set!",
    trainerWillSchedule:  "Your trainer will schedule your first session soon.",
    startingCreditsLabel: "Starting Credits",
    comeBackHint:         "Come back here to see your schedule, session history and progress.",

    // Credit
    creditBalance: "Credit Balance",
    myProgress:    "My Progress",

    // Remove/delete confirm text
    removeTraineeConfirmTitle: "Remove Trainee",
    removeTraineeConfirmSub:   "Their profile, sessions and progress data will be deleted.",
    deleteSessionTitle:        "Delete Session",

    // LineChart
    latest: "Latest",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Provider
// ─────────────────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem("btc_lang") || "tr"
  );

  function setLang(newLang) {
    setLangState(newLang);
    localStorage.setItem("btc_lang", newLang);
  }

  function t(key) {
    return translations[lang]?.[key] ?? translations["en"]?.[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
//  LangToggle — pill button shown in every dashboard
// ─────────────────────────────────────────────────────────────────────────────
export function LangToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <button
      className="lang-toggle"
      onClick={() => setLang(lang === "tr" ? "en" : "tr")}
      title={lang === "tr" ? "Switch to English" : "Türkçe'ye geç"}
    >
      {lang.toUpperCase()}
    </button>
  );
}

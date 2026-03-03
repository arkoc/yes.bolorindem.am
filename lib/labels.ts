/**
 * All user-facing text strings in the application.
 * To translate: replace string values in this object.
 * Dynamic strings use {placeholder} syntax — pass vars to the t() helper.
 */
const L = {
  brand: {
    name: "YES",
    subtitle: "bolorindem.am",
    adminSubtitle: "bolorindem.am · Ադմին",
    adminMobileTitle: "YES · Ադմին",
  },

  auth: {
    login: {
      title: "Բարի գալուստ",
      subtitlePhone: "Մուտքագրեք ձեր հեռախոսահամարը",
      subtitleOtp: "Մուտքագրեք {phone}-ին ուղարկված կոդը",
      phoneLabel: "Հեռախոսահամար",
      phonePlaceholder: "XX XXX XXX",
      sendCode: "Ուղարկել կոդը",
      otpLabel: "Հաստատման կոդ",
      otpPlaceholder: "000000",
      verify: "Հաստատել",
      backLink: "Հետ գնալ",
      codeSent: "Կոդը SMS-ով ուղարկված է",
      phoneInvalid: "TRANSLATE: Phone number must be 8 digits",
      sessionExpired: "Խնդրում ենք նորից մուտք գործել։",
    },
    register: {
      title: "Լրացրեք ձեր պրոֆիլը",
      subtitle: "Գրեք ձեր անունը, այն երևալու է Առաջաջարներ էջում",
      fullNameLabel: "Անուն Ազգանուն",
      fullNamePlaceholder: "Աննա Հակոբյան",
      avatarHint: "Ձեր ավատարը ավտոմատ կերպով գեներացվում է ձեր անունից",
      submit: "Միանալ",
      sessionExpired: "Խնդրում ենք նորից մուտք գործել։",
      saveFailed: "Չհաջողվեց պահպանել պրոֆիլը։ Խնդրում ենք կրկին փորձել։",
      welcome: "Բարի գալուստ",
    },
  },

  volunteer: {
    dashboard: {
      greeting: "Բարի վերադարձ",
      activeProjects: "Ակտիվ նախագծեր",
      recentActivity: "Վերջին գործողություններ",
      taskCount: "{count} հասանելի առաջադրանք",
      bonus: "+{points} բոնուս",
      emptyProjectsTitle: "Դեռևս ակտիվ նախագծեր չկան",
      emptyProjectsText: "Ստուգեք ավելի ուշ՝ առաջադրանքները կհայտնվեն այստեղ։",
      browseProjects: "Դիտել նախագծերը",
      statPoints: "Ընդհանուր միավորներ",
      statLeaderboard: "Առաջատարների աղյուսակ",
      statBadges: "Կրծքանշաններ",
      rankDisplay: "{rank} հորիզոնական",
      badgesSection: "Կրծքանշաններ",
      badgesShowAll: "Տեսնել բոլորը",
      badgesEarnFirst: "Ստացիր առաջինդ →",
    },

    projects: {
      title: "Նախագծեր",
      subtitle: "Ակտիվ նախագծեր և առաջադրանքներ",
      taskCount: "{count} առաջադրանք",
      emptyTitle: "Ակտիվ նախագծեր չկան",
      emptyText: "Նախագծերը կհայտնվեն այստեղ",
      dateFrom: "{date}-ից",
      dateUntil: "Մինչև {date}",
    },

    projectDetail: {
      backLink: "Վերադառնալ նախագծերին",
      yourProgress: "Ձեր առաջընթացը",
      progressText: "{completed}/{total} առաջադրանք",
      tasksHeading: "Առաջադրանքներ",
      emptyTasks: "Դեռևս առաջադրանքներ չկան։",
    },

    taskDetail: {
      backLink: "Վերադառնալ {title}",
      typeStandard: "Ստանդարտ առաջադրանք",
      typeForm: "Հարցերով առաջադրանք",
      typeLocation: "Լոկացիայով առաջադրանք",
      typePhoto: "Նկարով առաջադրանք",
      typeDefault: "Առաջադրանք",
      periodDay: "{limit}× օրեկան",
      periodWeek: "{limit}× շաբաթական",
    },

    leaderboard: {
      title: "Առաջատարների աղյուսակ",
      subtitle: "Լավագույն կամավորները՝ ըստ միավորների",
      me: "Դուք — {name}",
      completions: "{count} կատարում",
      emptyText: "Կամավորներ դեռ չկան։ Եղեք առաջինը։",
    },

    nav: {
      dashboard: "Հիմնական",
      projects: "Նախագծեր",
      leaderboard: "Առաջատարներ",
      profile: "Պրոֆիլ",
      adminSection: "Ադմին",
      adminPanel: "Ադմին վահանակ",
      signOut: "Ելք",
      signedOut: "Հաջողությամբ դուրս եք եկել համակարգից",
    },

    profile: {
      title: "Պրոֆիլ",
      statPoints: "Միավորներ",
      statRank: "Հորիզոնական",
      statTasksDone: "Կատարված առաջադրանքներ",
      recentPoints: "Վերջին միավորները",
      adminPanel: "Ադմին վահանակ",
      badgesTitle: "Կրծքանշաններ",
      badgesEarned: "{count} ձեռք բերված",
    },
  },

  admin: {
    nav: {
      dashboard: "Ընդհանուր",
      projects: "Նախագծեր",
      users: "Օգտատերեր",
      completions: "Կատարումներ",
      pointGrants: "Միավորների հատկացում",
      backToApp: "Վերադառնալ հավելված",
    },

    dashboard: {
      title: "Ադմին վահանակ",
      subtitle: "Կառավարման ընդհանուր վահանակ",
      newProject: "Նոր նախագիծ",
      statVolunteers: "Կամավորներ",
      statActiveProjects: "Ակտիվ նախագծեր",
      statCompletionsToday: "Այսօրվա կատարումներ",
      statTotalPoints: "Շնորհված ընդհանուր միավորներ",
      recentCompletions: "Վերջին կատարումները",
      viewAll: "Դիտել բոլորը",
      noCompletions: "Այսօր դեռ կատարումներ չկան",
    },

    projects: {
      title: "Նախագծեր",
      subtitle: "Կառավարեք նախագծերն ու առաջադրանքները",
      newProject: "Նոր նախագիծ",
      taskCount: "{count} առաջադրանք",
      completions: "Կատարումներ",
      edit: "Խմբագրել",
      tasks: "Առաջադրանքներ",
      emptyTitle: "Նախագծեր դեռ չկան",
      createFirst: "Ստեղծել առաջին նախագիծը",
      backLink: "Վերադառնալ նախագծերին",
      editTitle: "Խմբագրել նախագիծը",
      newTitle: "Նոր նախագիծ",
      newSubtitle: "Ստեղծել նոր նախագիծ",
      tasksSubtitle: "Կառավարել այս նախագծի առաջադրանքները",
    },

    tasks: {
      backLink: "Վերադառնալ առաջադրանքներին",
      editTitle: "Խմբագրել առաջադրանքը",
    },

    users: {
      title: "Օգտատերեր",
      subtitle: "{count} կամավոր",
      empty: "Դեռևս գրանցված օգտատերեր չկան",
    },

    completions: {
      title: "Կատարումներ",
      recordCount: "{count} գրառում",
      recordCountPlural: "{count} գրառում",
      filtered: "(ֆիլտրված)",
      formData: "Ֆորմի տվյալներ →",
      completionNumber: "կատարում #{number}",
      emptyText: "Կատարումներ չեն գտնվել",
    },

    points: {
      title: "Միավորների ձեռքով հատկացում",
      subtitle: "Ավելացնել կամ հանել միավորներ կամավորներից",
      grantCardTitle: "Ավելացնել / Հանել միավորներ",
      recentGrantsTitle: "Վերջին ձեռքով հատկացումները",
      emptyGrants: "Դեռևս ձեռքով հատկացումներ չկան",
    },
  },

  forms: {
    project: {
      titleLabel: "Վերնագիր *",
      titlePlaceholder: "Նախագծի վերնագիր",
      titleRequired: "Վերնագիրը պարտադիր է",
      descriptionLabel: "Նկարագրություն",
      descriptionPlaceholder: "Նկարագրություն...",
      statusLabel: "Կարգավիճակ",
      statusDraft: "Սևագիր",
      statusActive: "Ակտիվ",
      statusCompleted: "Ավարտված",
      statusArchived: "Արխիվացված",
      bonusPointsLabel: "Ավարտման բոնուս",
      startDateLabel: "Սկզբի ամսաթիվ",
      endDateLabel: "Ավարտի ամսաթիվ",
      submitUpdate: "Թարմացնել նախագիծը",
      submitCreate: "Ստեղծել նախագիծ",
      deleteConfirm: "Ջնջե՞լ այս նախագիծը և դրա բոլոր առաջադրանքները։",
      toastUpdated: "Նախագիծը թարմացված է",
      toastCreated: "Նախագիծը ստեղծված է",
      toastSaveFailed: "Չհաջողվեց պահպանել նախագիծը։",
      toastDeleted: "Նախագիծը ջնջված է",
      toastDeleteFailed: "Չհաջողվեց ջնջել նախագիծը։",
    },

    task: {
      titleLabel: "Վերնագիր *",
      titlePlaceholder: "Առաջադրանքի վերնագիր",
      titleRequired: "Վերնագիրը պարտադիր է",
      descriptionLabel: "Նկարագրություն",
      descriptionPlaceholder: "Նկարագրեք, թե ինչ պետք է անեն կամավորները...",
      typeLabel: "Տեսակը",
      typeStandard: "Ստանդարտ",
      typeForm: "Ֆորմ",
      typeLocation: "Լոկացյա",
      typePhoto: "Նկար",
      pointsLabel: "Միավոր",
      maxPerUserLabel: "Քանակ",
      unlimitedLabel: "Անսահմանափակ",
      activeLabel: "Ակտիվ",
      formFieldsHeading: "Ֆորմի դաշտեր",
      locationConfigHeading: "Լոկացյաի կարգավորումներ",
      photoHint:
        "Կամավորները կկատարեն առաջադրանքը լուսանկարելով։ Լուսանկարը վերբեռնվում է ավտոմատ կերպով։",
      submitUpdate: "Թարմացնել առաջադրանքը",
      submitCreate: "Ստեղծել առաջադրանք",
      deleteConfirm: "Ջնջե՞լ այս առաջադրանքը։",
      toastUpdated: "Առաջադրանքը թարմացված է",
      toastCreated: "Առաջադրանքը ստեղծված է",
      toastDeleted: "Առաջադրանքը ջնջված է",
      toastSaveFailed: "Չհաջողվեց պահպանել առաջադրանքը։",
      toastDeleteFailed: "Չհաջողվեց ջնջել առաջադրանքը։",
      periodTypeLabel: "Ժամանակային սահմանափակում",
      periodTypeNone: "Չկա",
      periodTypeDay: "Օրական",
      periodTypeWeek: "Շաբաթական",
      periodLimitLabel: "Առավելագույն կատարում ժամանակում",
      batchSubmissionLabel: "Խմբային կատարում",
    },

    manualGrant: {
      volunteerLabel: "Կամավոր",
      volunteerPlaceholder: "Որոնել կամավոր...",
      volunteerRequired: "Խնդրում ենք ընտրել կամավոր",
      amountLabel: "Միավորների քանակ",
      amountHint: "(բացասական՝ հանելու համար)",
      amountPlaceholder: "օրինակ՝ 50 կամ -10",
      amountZeroError: "Քանակը չի կարող զրո լինել",
      reasonLabel: "Պատճառ",
      reasonPlaceholder: "Ինչո՞ւ եք շնորհում/հանում միավորները",
      reasonRequired: "Պատճառը պարտադիր է",
      submit: "Կիրառել միավորները",
      toastSuccess: "{amount} միավոր շնորհված է",
      toastFailed: "Չհաջողվեց շնորհել միավորները։",
    },

    formBuilder: {
      emptyState: "Դաշտեր չկան։ Ավելացրեք դաշտ ստորև։",
      requiredLabel: "Պարտադիր",
      fieldLabel: "Label",
      fieldLabelPlaceholder: "Դաշտի պիտակ",
      typeLabel: "Տեսակ",
      typeText: "Տեքստ",
      typeNumber: "Թիվ",
      typeSelect: "Ընտրություն",
      typeCheckbox: "Checkbox",
      typeLink: "Հղում (URL)",
      optionsHeading: "Տարբերակներ",
      addOptionPlaceholder: "Ավելացնել տարբերակ...",
      addOptionBtn: "Ավելացնել",
      addFieldBtn: "Ավելացնել դաշտ",
    },

    locationBuilder: {
      descriptionLabel: "Նկարագրություն (ցուցադրվում է կամավորներին)",
      descriptionPlaceholder: "Գրանցվեք գրասենյակում...",
      targetPointsHeading: "Թիրախային կետեր",
      pasteUrlPlaceholder: "Տեղադրեք Yandex կամ Google Maps-ի հղումը այստեղ...",
      invalidUrl: "Այս հղումում կոորդինատներ չգտնվեցին",
      pointLabelPlaceholder: "Կետի պիտակը",
      radiusPlaceholder: "Շառավիղ (մ)",
      latPlaceholder: "Latitude",
      lngPlaceholder: "Longitude",
      maxCheckinsPlaceholder: "Առավելագույն գրանցումներ",
      addPointBtn: "Ավելացնել կետ",
    },
  },

  completion: {
    standard: {
      progressText: "{count} - {max} կատարումից արված է",
      progressTextOnce: "Նշեք այս առաջադրանքը որպես ավարտված՝ միավորներ վաստակելու համար",
      completeBtn: "Ավարտել առաջադրանքը (+{points} միավոր)",
      batchLabel: "TRANSLATE: How many completions",
      completeBatchBtn: "TRANSLATE: Submit {count}× (+{points} pts)",
      successTitle: "TRANSLATE: Task completed",
      successPoints: "+{points} միավոր վաստակված է",
      backToProject: "Վերադառնալ նախագծին",
      alreadyDoneTitle: "Արդեն ավարտված է",
      alreadyDoneText: "Դուք արդեն ստացել եք ձեր միավորներն այս առաջադրանքի համար։",
      allDoneTitle: "Բոլոր {max} կատարումներն արված են։",
      allDoneText: "Առավելագույն կատարումների քանակը լրացված է։",
      toastSuccess: "+{points} միավոր վաստակված է։",
      toastNetworkError: "Ցանցային սխալ։ Խնդրում ենք կրկին փորձել։",
    },

    form: {
      cardTitle: "Լրացրեք մանրամասները",
      repeatableHint: "({count} - {max}-ից)",
      selectPlaceholder: "Ընտրել {label}",
      validUrlError: "Պետք է լինի վավեր URL",
      fieldRequired: "{label} պարտադիր է",
      submitBtn: "Ուղարկել և վաստակել +{points} միավոր",
      successTitle: "Ուղարկված է։",
      successPoints: "+{points} միավոր վաստակված է",
      backToProject: "Վերադառնալ նախագծին",
      alreadyDoneTitle: "Արդեն ուղարկված է",
      allDoneTitle: "Բոլոր {max} ուղարկումներն արված են։",
      allDoneText: "Առավելագույն ուղարկումների քանակը լրացված է։",
      emptyForm: "Ձևաթղthի դաշtեr կazmaðevovaç çen։",
      toastSuccess: "+{points} միավոր վաստակված է։",
      toastNetworkError: "Ցանցային սխալ։ Խնդրում ենք կրկին փորձել։",
      toastFailed: "Չհաջողվեց ուղարկել առաջադրանքը։",
    },

    location: {
      cardTitle: "Հաստատեք ձեր լոկացյան",
      repeatableHint: "({count} - {max}-ից)",
      batchLabel: "Քանի՞ գրանցում",
      successTitle: "Լոկացյան հաստատված է։",
      successPoints: "+{points} միավոր վաստակված է",
      backToProject: "Վերադառնալ նախագծին",
      alreadyDoneTitle: "Լոկացյան արդեն հաստատված է",
      alreadyDoneText: "Դուք ավարտել եք այս լոկացյոն առաջադրանքը։",
      allDoneTitle: "Բոլոր {max} գրանցումներն արված են։",
      allDoneText: "Առավելագույն գրանցումների քանակը լրացված է։",
      emptyConfig: "Այս առաջադրանքի համար լոկացյոն տվյալներ չկան։",
      toastSuccess: "+{points} միավոր վաստակված է։",
      toastNetworkError: "Ցանցային սխալ։ Խնդրում ենք կրկին փորձել։",
    },

    photo: {
      cardTitle: "Ուղարկեք լուսանկարչական ապացույց",
      repeatableHint: "({count} - {max}-ից)",
      takePhoto: "Լուսանկարել / Ընտրել լուսանկար",
      addPhoto: "Ավելացնել ևս մեկ լուսանկար",
      submitBtn: "Ուղարկել լուսանկարը (+{points} միավոր)",
      successTitle: "Լուսանկարն ուղարկված է։",
      successPoints: "+{points} միավոր վաստակված է",
      backToProject: "Վերադառնալ նախագծին",
      alreadyDoneTitle: "Լուսանկարն արդեն ուղարկված է",
      alreadyDoneText: "Դուք ավարտել եք այս լուսանկարչական առաջադրանքը։",
      allDoneTitle: "Բոլոր {max} լուսանկարներն ուղարկված են։",
      allDoneText: "Առավելագույն կատարումների քանակը լրացված է։",
      toastSuccess: "+{points} միավոր վաստակված է։",
      toastUploadFailed: "Վերբեռնումը ձախողվեց։ Խնդրում ենք կրկին փորձել։",
    },
  },

  filter: {
    allProjects: "Բոլոր նախագծերը",
    searchVolunteer: "Որոնել կամավոր...",
    clear: "Մաքրել",
    noResults: "Արդյունքներ չկան",
  },

  reverseButton: {
    confirm: "Չեղարկե՞լ {points} միավորն այս կատարման համար։",
    label: "Չեղարկել",
    toastFailed: "Չհաջողվեց չեղարկել միավորները։",
    toastSuccess: "−{points} միավոր չեղարկված է",
  },
} as const;

export default L;

/**
 * Interpolates {placeholder} tokens in a label string.
 * Example: t(L.volunteer.dashboard.taskCount, { count: 5 }) → "5 tasks available"
 */
export function t(
  str: string,
  vars: Record<string, string | number>
): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}
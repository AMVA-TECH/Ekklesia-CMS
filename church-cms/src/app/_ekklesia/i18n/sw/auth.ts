/** Swahili: shared chrome, sign-in, registration, verification and check-in. */
export const swAuth: Record<string, string> = {
  // Shared chrome
  Previous: 'Iliyotangulia',
  Page: 'Ukurasa',
  of: 'kati ya',
  Next: 'Inayofuata',
  'Dismiss notification': 'Funga taarifa',
  'Close dialog': 'Funga dirisha',
  'Ekklesia home': 'Mwanzo wa Ekklesia',
  '(required)': '(lazima)',
  'Skip to main content': 'Ruka hadi maudhui makuu',
  'Primary navigation': 'Urambazaji mkuu',
  'Expand sidebar': 'Panua menyu ya pembeni',
  'Collapse sidebar': 'Kunja menyu ya pembeni',
  Collapse: 'Kunja',
  'Primary (collapsed)': 'Urambazaji mkuu (umekunjwa)',
  'Open navigation': 'Fungua menyu',
  'Close navigation': 'Funga menyu',
  Language: 'Lugha',
  Kiswahili: 'Kiswahili',
  English: 'Kiingereza',
  Ekklesia: 'Ekklesia',

  // Registration
  'Enter your first name.': 'Andika jina lako la kwanza.',
  'Enter your last name.': 'Andika jina lako la mwisho.',
  'Enter your phone number.': 'Andika namba yako ya simu.',
  'That email does not look right.': 'Barua pepe hiyo haionekani sahihi.',
  'Select the church you want to be attached to.': 'Chagua kanisa unalotaka kuunganishwa nalo.',
  'Your registration was received. A church administrator must attach you before you can use church services.':
    'Usajili wako umepokelewa. Msimamizi wa kanisa lazima akuunganishe kabla hujaanza kutumia huduma za kanisa.',
  'Request failed': 'Ombi halikufanikiwa',
  'Request to join': 'Omba kujiunga',
  'Tell us who you are and which church to attach to. Attachment unlocks that church’s services after an admin approves you. This does not sign you in — use Sign in with your phone and PIN once approved.':
    'Tuambie wewe ni nani na unataka kuunganishwa na kanisa gani. Ukiunganishwa, utapata huduma za kanisa hilo baada ya msimamizi kukuidhinisha. Hii haikuingizi kwenye akaunti — baada ya kuidhinishwa, ingia kwa simu yako na PIN.',
  'Registration received': 'Usajili umepokelewa',
  'Waiting for': 'Tunamsubiri',
  'to attach you. You will be able to sign in after approval.':
    'akuunganishe. Utaweza kuingia baada ya kuidhinishwa.',
  'First name': 'Jina la kwanza',
  'Last name': 'Jina la mwisho',
  Phone: 'Simu',
  '{0} Used to sign in after approval.': '{0} Itatumika kuingia baada ya kuidhinishwa.',
  Email: 'Barua pepe',
  Optional: 'Si lazima',
  'Church to attach to': 'Kanisa la kuunganishwa nalo',
  'Attachment connects you to this church’s services after approval':
    'Kuunganishwa kunakupa huduma za kanisa hili baada ya kuidhinishwa',
  'Type at least 2 letters to find your church': 'Andika angalau herufi 2 kutafuta kanisa lako',
  'Selected church': 'Kanisa ulilochagua',
  Change: 'Badilisha',
  'Search church name': 'Tafuta jina la kanisa',
  'Searching…': 'Inatafuta…',
  'Sending request…': 'Inatuma ombi…',
  'Request sent': 'Ombi limetumwa',
  'Submit join request': 'Tuma ombi la kujiunga',
  'Already approved?': 'Umeshaidhinishwa?',
  'Sign in': 'Ingia',
  'Registration successful': 'Usajili umefanikiwa',
  'Your request was received. You are not signed in yet.': 'Ombi lako limepokelewa. Bado hujaingia.',
  'Stay here': 'Baki hapa',
  'Go to sign in': 'Nenda kuingia',
  Success: 'Imefanikiwa',
  'Waiting for attachment': 'Inasubiri kuunganishwa',
  'must approve and attach you before church services unlock. After that, sign in with your phone and the PIN they give you.':
    'lazima akuidhinishe na kukuunganisha kabla huduma za kanisa hazijafunguka. Baada ya hapo, ingia kwa simu yako na PIN utakayopewa.',
  'Registration failed': 'Usajili haukufanikiwa',
  'Something went wrong. Your request was not sent.': 'Kuna tatizo limetokea. Ombi lako halikutumwa.',
  'Try again': 'Jaribu tena',
  Failed: 'Imeshindikana',

  // Sign in
  'Phone number': 'Namba ya simu',
  'Email address': 'Anwani ya barua pepe',
  'Enter a Tanzania mobile number, e.g. 0712 345 678.': 'Andika namba ya simu ya Tanzania, mfano 0712 345 678.',
  'Please enter your PIN.': 'Tafadhali andika PIN yako.',
  'Your PIN is 4 to 8 digits.': 'PIN yako ina tarakimu 4 hadi 8.',
  'That phone, email, or PIN did not match. Please try again.':
    'Simu, barua pepe au PIN hiyo haikulingana. Tafadhali jaribu tena.',
  'Too many attempts. Please wait a minute and try again.':
    'Majaribio ni mengi mno. Tafadhali subiri dakika moja kisha ujaribu tena.',
  'We could not sign you in just now.': 'Hatukuweza kukuingiza kwa sasa.',
  'We could not reach the server. Check your connection and try again.':
    'Hatukuweza kufikia seva. Angalia mtandao wako kisha ujaribu tena.',
  'Welcome back': 'Karibu tena',
  'Sign in with the phone or email your church has on file.':
    'Ingia kwa simu au barua pepe ambayo kanisa lako limeihifadhi.',
  'Need a hand?': 'Unahitaji msaada?',
  'If you have forgotten your PIN or your details changed, your church office can reset them for you.':
    'Ikiwa umesahau PIN yako au taarifa zako zimebadilika, ofisi ya kanisa inaweza kukusaidia kuziweka upya.',
  'Sign-in method': 'Njia ya kuingia',
  'Tanzania mobile — type 0712 345 678 or +255…': 'Simu ya Tanzania — andika 0712 345 678 au +255…',
  'The email your church office has for you': 'Barua pepe ambayo ofisi ya kanisa inayo',
  PIN: 'PIN',
  '4 to 8 digits — the one your church gave you.': 'Tarakimu 4 hadi 8 — uliyopewa na kanisa lako.',
  Hide: 'Ficha',
  Show: 'Onyesha',
  'Signing you in…': 'Tunakuingiza…',
  'By signing in you agree to your church’s handling of your information, kept private and never shared with other churches.':
    'Kwa kuingia unakubali kanisa lako kushughulikia taarifa zako; zinahifadhiwa kwa siri na hazishirikishwi kwa makanisa mengine.',
  'New to this church?': 'Mgeni katika kanisa hili?',
  'Need help?': 'Unahitaji msaada?',
  '· built for the local church': '· imejengwa kwa ajili ya kanisa la mahali',
  'Need help signing in?': 'Unahitaji msaada wa kuingia?',
  'Talk to your church office': 'Wasiliana na ofisi ya kanisa lako',
  'Your church home, on any phone.': 'Nyumbani kwako kanisani, kwenye simu yoyote.',
  'Services, groups, and giving — calm and close to community.':
    'Ibada, vikundi na matoleo — kwa utulivu na karibu na jumuiya.',

  // Check-in
  'This check-in link is missing its code. Ask an usher for a fresh QR.':
    'Kiungo hiki cha kuthibitisha mahudhurio hakina msimbo. Muombe mhudumu QR mpya.',
  'Enter your name or phone so we can record you.': 'Andika jina au simu yako ili tukuandikishe.',
  'Check-in did not go through. Please try again or see an usher.':
    'Kuthibitisha mahudhurio hakukufanikiwa. Tafadhali jaribu tena au mwone mhudumu.',
  'Check in': 'Thibitisha mahudhurio',
  'Scan the attendance QR at the gathering, or ask an usher for help. This page needs a valid check-in code in the link.':
    'Skani QR ya mahudhurio kwenye mkusanyiko, au muombe mhudumu msaada. Ukurasa huu unahitaji msimbo halali kwenye kiungo.',
  'You’re checked in': 'Mahudhurio yako yamethibitishwa',
  'Thanks — your attendance for this gathering has been recorded. You can close this page.':
    'Asante — mahudhurio yako kwa mkusanyiko huu yameandikwa. Unaweza kufunga ukurasa huu.',
  'Tell us who you are so we can mark you present.': 'Tuambie wewe ni nani ili tukuandike umehudhuria.',
  'Your name': 'Jina lako',
  'Preferred if you are visiting.': 'Inapendekezwa ikiwa wewe ni mgeni.',
  'e.g. Ada Noah': 'mfano Ada Noah',
  'Optional — helps match an existing record.': 'Si lazima — husaidia kulinganisha na kumbukumbu iliyopo.',
  'Checking in…': 'Inathibitisha…',

  // Verification
  'Local/dev mode: use the code below (not sent by SMS).':
    'Hali ya majaribio: tumia msimbo ulio hapa chini (haujatumwa kwa SMS).',
  'We sent a 6-digit code to your phone or email.': 'Tumetuma msimbo wa tarakimu 6 kwenye simu au barua pepe yako.',
  'A fresh code is on the way.': 'Msimbo mpya unakuja.',
  'We could not send a new code just now.': 'Hatukuweza kutuma msimbo mpya kwa sasa.',
  'Check your connection and try again.': 'Angalia mtandao wako kisha ujaribu tena.',
  'The code is 6 digits.': 'Msimbo una tarakimu 6.',
  'That code did not match. Check for typos or ask for a new one.':
    'Msimbo huo haukulingana. Angalia makosa ya uandishi au omba mpya.',
  'Too many attempts. Please wait a minute.': 'Majaribio ni mengi mno. Tafadhali subiri dakika moja.',
  'We could not verify that code.': 'Hatukuweza kuthibitisha msimbo huo.',
  'One more step': 'Hatua moja zaidi',
  'Enter the 6-digit code we sent to keep your church account safe.':
    'Andika msimbo wa tarakimu 6 tuliotuma ili akaunti yako ya kanisa iwe salama.',
  '6-digit code': 'Msimbo wa tarakimu 6',
  'Trust this device for a while': 'Amini kifaa hiki kwa muda',
  'Only turn this off on shared or public phones.': 'Zima hii tu kwenye simu za kushirikiana au za umma.',
  'Dev verification code': 'Msimbo wa majaribio',
  'Shown only when ALLOW_DEV_AUTH=1. Paste or use the filled field.':
    'Huonekana tu ALLOW_DEV_AUTH=1. Bandika au tumia sehemu iliyojazwa.',
  'Verifying…': 'Inathibitisha…',
  'Verify and continue': 'Thibitisha na uendelee',
  'Sending…': 'Inatuma…',
  'Send a new code': 'Tuma msimbo mpya',
  'Send a new code in {0}s': 'Tuma msimbo mpya baada ya sekunde {0}',
  'Use a different phone or email': 'Tumia simu au barua pepe nyingine',
};

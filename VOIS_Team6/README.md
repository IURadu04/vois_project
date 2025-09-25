Note pentru frontend

Token-ul JWT trebuie salvat de frontend după login.
Pentru orice request protejat → trimiteți header-ul Authorization.
Adminii pot lista toți userii; utilizatorii normali nu au acces la asta.

Folositi-va de endpoint-urile create (se afla in main.py aproape toate, iar cele doua de login si register se gasesc in auth.py)
In auth.py, ultimul endpoint este pus sub comentariu, lasati-l acolo asa (sau stergeti-l daca chiar va deranjeaza), dar nu va folositi de el, ca e mai simplu asa

Ca sa instalati toate librariile necesare, rulati in terminal: pip install -r requirements.txt
Daca vreti sa testati sa vedeti ca merge, rulati in terminal: python -m uvicorn app.main:app --reload

Va urez succes!!
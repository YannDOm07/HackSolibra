# Tableau de bord KaboChar

Salle de contrôle web : vue d'ensemble, fours en direct, lots et passeports, producteurs, rapport trimestriel imprimable, méthode et sources.

```bash
npm install
npm run dev      # développement : http://localhost:5173 (l'API doit tourner sur le port 8000)
npm run build    # production : le serveur Python le sert ensuite sur http://localhost:8000/tableau/
```

L'adresse de l'API se règle avec la variable `VITE_API_URL` si besoin.

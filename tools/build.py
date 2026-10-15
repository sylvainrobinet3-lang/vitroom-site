#!/usr/bin/env python3
"""Construit le site Vitroom (vraies pages HTML) à partir de src/.

Utilisation :  python3 tools/build.py
Sources modifiables : src/pages/*.html (contenu de chaque page), src/partials/ (en-tête, pied de page),
assets/ (CSS, JS, polices, images). Les fichiers .html à la racine sont générés : ne pas les modifier à la main.
"""
import hashlib, html, json, os, re, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://vitroom.be"
TODAY = datetime.date.today().isoformat()

# Réglages publics (aucun secret ici : les clés secrètes vont dans api/config.php, hors du dépôt).
CONFIG = {
    "email": "sylvainrobinet030308@gmail.com",
    "phone": "0470 53 70 08",
    "analyticsToken": "",     # jeton Cloudflare Web Analytics (public), vide = mesure d'audience désactivée
    "turnstileSiteKey": "",   # clé de SITE Cloudflare Turnstile (publique), vide = désactivé
}

# route, fichier, URL, titre, description, options
PAGES = [
    ("accueil", "index.html", "/", "Création de site internet à Mons — Vitroom",
     "Sites internet sur mesure pour artisans, commerçants et indépendants, à Mons, Soignies et partout en Belgique. Rapides, pensés pour le mobile. Devis gratuit.", {}),
    ("services", "services.html", "/services", "Création de site internet sur mesure à Mons — Services Vitroom",
     "Site complet pensé pour votre métier : design sur mesure, version mobile, référencement local, formulaire de devis, nom de domaine et hébergement inclus.", {}),
    ("exemples", "exemples.html", "/exemples", "Exemples de sites internet pour artisans et commerces — Vitroom",
     "Découvrez trois sites complets créés pour l'exemple : paysagiste avec devis en ligne, salon de coiffure avec prise de rendez-vous, restaurant avec réservation.", {}),
    ("rentabilite", "rentabilite.html", "/rentabilite", "Calculateur de rentabilité d'un site internet — Vitroom",
     "Combien de nouveaux clients faut-il pour rembourser votre site internet ? Calculez-le en quelques secondes selon votre métier, votre marge et votre budget.", {}),
    ("diagnostic", "diagnostic.html", "/diagnostic", "Diagnostic gratuit de votre présence en ligne — Vitroom",
     "Évaluez votre site et votre visibilité sur Google en dix questions, puis recevez gratuitement un diagnostic personnalisé avec des conseils concrets et précis.", {"cta": "form"}),
    ("a-propos", "a-propos.html", "/a-propos", "À propos de Vitroom, création de sites internet à Mons",
     "Vitroom, c'est un interlocuteur unique basé dans la région de Mons, qui crée des sites sur mesure pour les entreprises de toute la Belgique, rapidement.", {}),
    ("questions", "questions.html", "/questions", "Questions sur la création de votre site internet — Vitroom",
     "Prix, délais, nom de domaine, modifications, référencement : les réponses aux questions fréquentes, et un formulaire pour poser la vôtre. Réponse rapide.", {"cta": "form"}),
    ("devis", "devis.html", "/devis", "Devis gratuit pour votre site internet à Mons — Vitroom",
     "Décrivez votre entreprise et votre projet en trois étapes simples et recevez un devis gratuit et sans engagement pour votre site internet sur mesure.", {"cta": "form"}),
    ("mentions-legales", "mentions-legales.html", "/mentions-legales", "Mentions légales — Vitroom",
     "Mentions légales du site vitroom.be : éditeur du site, coordonnées de contact, hébergeur, propriété intellectuelle et liens vers les autres pages légales.", {}),
    ("confidentialite", "confidentialite.html", "/confidentialite", "Politique de confidentialité — Vitroom",
     "Quelles données sont collectées par les formulaires de vitroom.be, pourquoi, pendant combien de temps, qui y a accès et comment exercer vos droits RGPD.", {}),
    ("cgu", "cgu.html", "/cgu", "Conditions d'utilisation du site — Vitroom",
     "Conditions d'utilisation du site vitroom.be : accès, outils gratuits, formulaires, propriété intellectuelle, responsabilité, liens externes et droit belge.", {}),
    ("demo-jardin", "exemple-paysagiste.html", "/exemple-paysagiste", "Atelier Vert, paysagiste (site d'exemple) — Vitroom",
     "Site d'exemple réalisé par Vitroom pour une entreprise fictive de paysagisme : réalisations filtrables, avant/après, devis avec photos du terrain et horaires.",
     {"demo": True, "noindex": True}),
    ("demo-coiffure", "exemple-coiffure.html", "/exemple-coiffure", "Studio Lumen, salon de coiffure (site d'exemple) — Vitroom",
     "Site d'exemple réalisé par Vitroom pour un salon de coiffure fictif : tarifs par catégorie, horaires en direct et prise de rendez-vous en ligne en 4 étapes.",
     {"demo": True, "noindex": True}),
    ("demo-resto", "exemple-restaurant.html", "/exemple-restaurant", "La Table du Marché, restaurant (site d'exemple) — Vitroom",
     "Site d'exemple réalisé par Vitroom pour un restaurant fictif : carte filtrable par régime, horaires en direct et réservation de table en ligne en deux clics.",
     {"demo": True, "noindex": True}),
    ("404", "404.html", "/404", "Page introuvable — Vitroom",
     "Cette page n'existe pas ou plus. Retrouvez les pages principales du site Vitroom : accueil, services, exemples de sites et demande de devis gratuit en ligne.",
     {"noindex": True, "nocanonical": True}),
]

def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()

def write(p, s):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(s)

def ver(p):
    return hashlib.md5(read(p).encode()).hexdigest()[:8]

V_CSS, V_JS, V_DEMO = ver("assets/css/site.css"), ver("assets/js/site.js"), ver("assets/css/demo-fonts.css")
HEADER, FOOTER = read("src/partials/header.html"), read("src/partials/footer.html")
ROUTE_URLS = {p[0]: p[2] for p in PAGES}
OLD_HASHES = {"accueil": "/", "services": "/services", "exemples": "/exemples", "a-propos": "/a-propos", "questions": "/questions",
              "devis": "/devis", "mentions": "/mentions-legales", "rentabilite": "/rentabilite", "diagnostic": "/diagnostic",
              "demo-jardin": "/exemple-paysagiste", "demo-coiffure": "/exemple-coiffure", "demo-resto": "/exemple-restaurant"}

JSONLD = {
    "@context": "https://schema.org", "@type": "ProfessionalService", "name": "Vitroom", "url": SITE + "/",
    "logo": SITE + "/icon-512.png", "image": SITE + "/assets/img/og-vitroom.png",
    "description": "Création de sites internet sur mesure pour artisans, commerçants et indépendants.",
    "telephone": "+32470537008", "email": "sylvainrobinet030308@gmail.com",
    "areaServed": {"@type": "Country", "name": "Belgique"}, "founder": {"@type": "Person", "name": "Sylvain Robinet"},
}

def page_html(route, fname, url, title, desc, opt):
    content = read(f"src/pages/{route}.html").rstrip()
    extra = " demo " + {"demo-jardin": "dj", "demo-coiffure": "dc", "demo-resto": "dr"}[route] if opt.get("demo") else ""
    header = HEADER
    # Lien de navigation actif
    nav_route = route if route in ROUTE_URLS else None
    header = re.sub(r'(<a (?:class="[^"]*" )?href="%s" data-route="[^"]*")' % re.escape(url), r'\1 aria-current="page"', header) if nav_route and url != "/" else header
    footer = FOOTER
    # Un seul appel à l'action principal : sur les pages dont l'action est leur propre formulaire,
    # le bouton « Devis gratuit » de l'en-tête et de la barre mobile passe en bouton secondaire.
    if opt.get("cta") == "form":
        header = header.replace('<a class="btn btn-primary" href="/devis"', '<a class="btn btn-ghost" href="/devis"')
        footer = footer.replace('<a class="btn btn-primary" href="/devis">Devis gratuit</a>', '<a class="btn btn-ghost" href="/devis">Devis gratuit</a>')
    e = html.escape
    canonical = "" if opt.get("nocanonical") else f'<link rel="canonical" href="{SITE}{url}">\n'
    robots = '<meta name="robots" content="noindex, follow">\n' if opt.get("noindex") else ""
    demo_css = f'<link rel="stylesheet" href="/assets/css/demo-fonts.css?v={V_DEMO}">\n' if opt.get("demo") else ""
    og_url = SITE + (url if not opt.get("nocanonical") else "/")
    hash_redirect = ""
    jsonld = ""
    if route == "accueil":
        hash_redirect = "<script>(function(){var m=%s,h=location.hash.slice(1);if(m[h]&&m[h]!=='/')location.replace(m[h]);})();</script>\n" % json.dumps(OLD_HASHES, separators=(",", ":"))
        jsonld = '<script type="application/ld+json">%s</script>\n' % json.dumps(JSONLD, ensure_ascii=False, separators=(",", ":"))
    body_class = ' class="in-demo"' if opt.get("demo") else ""
    return f"""<!doctype html>
<html lang="fr-BE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
{canonical}{robots}{hash_redirect}<meta name="theme-color" content="#0B1F3C">
<link rel="preload" href="/assets/fonts/figtree-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/belleza-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css?v={V_CSS}">
{demo_css}<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_BE">
<meta property="og:site_name" content="Vitroom">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{og_url}">
<meta property="og:image" content="{SITE}/assets/img/og-vitroom.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Vitroom, sites internet sur mesure">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{SITE}/assets/img/og-vitroom.png">
{jsonld}<script>window.VITROOM_CONFIG = {json.dumps(CONFIG, ensure_ascii=False)};</script>
<script src="/assets/js/site.js?v={V_JS}" defer></script>
</head>
<body{body_class}>
{header.rstrip()}
<main id="main">
<div class="page{extra}" data-page="{route}">
{content}
</div>
</main>
{footer.rstrip()}
</body>
</html>
"""

def main():
    urls = []
    for p in PAGES:
        route, fname, url, title, desc, opt = p
        if not (140 <= len(desc) <= 160):
            print(f"  ! description de {route} : {len(desc)} caractères (attendu 140-160)")
        write(fname, page_html(*p))
        if not opt.get("noindex"):
            urls.append(url)
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        pr = "1.0" if u == "/" else ("0.9" if u in ("/devis", "/services") else ("0.3" if u in ("/mentions-legales", "/confidentialite", "/cgu") else "0.7"))
        sm.append(f"  <url><loc>{SITE}{u}</loc><lastmod>{TODAY}</lastmod><priority>{pr}</priority></url>")
    sm.append("</urlset>")
    write("sitemap.xml", "\n".join(sm) + "\n")
    write("robots.txt", f"User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /src/\nDisallow: /tools/\n\nSitemap: {SITE}/sitemap.xml\n")
    print(f"{len(PAGES)} pages générées, {len(urls)} dans le sitemap.")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Génère un aperçu de site pour un prospect à partir d'un petit fichier JSON.

Utilisation :  python3 tools/apercu.py fiche.json [fiche2.json ...]
Sortie       :  apercu/<slug>.html  (servi à https://vitroom.be/apercu/<slug>, noindex)

Champs du JSON (tout est facultatif sauf slug, nom, metier, commune, tel) :
  slug, nom, metier, commune, pays ("BE"/"FR"), tel (ex. "+32 65 00 00 00"), mail,
  titre (accroche courte), intro (2 phrases), theme (batiment|jardin|auto|horeca|beaute|sante|defaut),
  cta ("devis" | "appel" | "reserver"), services: [{"titre","texte"}], atouts: ["..."],
  avis: [{"prenom","texte"}], note (ex. "4,8"), nb_avis, source_avis (ex. "Google"),
  zone, horaires: [["Lundi – Vendredi","8 h – 18 h"], ...], photos: [{"src","alt"}],
  adresse, numero_entreprise (BCE ou SIRET), dirigeant
Un champ absent devient « [à compléter] » ou la section est remplacée par un emplacement neutre.
Aucun texte inventé : le script n'écrit que ce que contient la fiche.
"""
import html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "apercu")

THEMES = {  # couleur principale (boutons, titres), foncé (fonds), clair (fonds doux) — contraste AA vérifié sur blanc
    "batiment": ("#B4470F", "#1F2933", "#FBF3EE"),
    "jardin":   ("#2F6B3A", "#16301C", "#EFF6EF"),
    "auto":     ("#B3261E", "#1C1C1E", "#F7EFEE"),
    "horeca":   ("#8A4B12", "#2B1B10", "#FAF3EA"),
    "beaute":   ("#9C2F62", "#2A1621", "#FBF0F5"),
    "sante":    ("#0F6E7A", "#10282C", "#ECF6F7"),
    "defaut":   ("#1F4E9B", "#0F1C33", "#EEF2FA"),
}
CTA = {"devis": "Demander un devis gratuit", "appel": "Appeler", "reserver": "Réserver"}
TODO = '<span class="todo">[à compléter]</span>'
e = lambda s: html.escape(str(s), quote=True)


def tel_href(t):
    d = re.sub(r"[^\d+]", "", t or "")
    if d.startswith("0") and not d.startswith("00"):
        d = "+32" + d[1:]
    return d


def build(f):
    p = json.load(open(f, encoding="utf-8"))
    for k in ("slug", "nom", "metier", "commune", "tel"):
        if not p.get(k):
            sys.exit(f"{f} : champ obligatoire manquant : {k}")
    main, dark, soft = THEMES.get(p.get("theme", "defaut"), THEMES["defaut"])
    cta = p.get("cta", "devis")
    tel, telh = p["tel"], tel_href(p["tel"])
    mail = p.get("mail")
    titre = p.get("titre") or f"{p['metier']} à {p['commune']}"
    intro = p.get("intro") or ""
    nom, commune, metier = e(p["nom"]), e(p["commune"]), e(p["metier"])

    services = "".join(f'<article class="card"><h3>{e(s["titre"])}</h3><p>{e(s.get("texte",""))}</p></article>'
                       for s in p.get("services", [])) or f'<article class="card"><h3>Prestations</h3><p>{TODO}</p></article>'
    atouts = "".join(f"<li>{e(a)}</li>" for a in p.get("atouts", []))
    photos = "".join(f'<figure><img src="{e(ph["src"])}" alt="{e(ph.get("alt",""))}" loading="lazy" width="600" height="450"></figure>'
                     for ph in p.get("photos", [])) or \
        "".join(f'<figure class="ph"><span>Photo de réalisation {i}<br>[à remplacer par vos photos]</span></figure>' for i in (1, 2, 3))
    if p.get("avis"):
        head = ""
        if p.get("note"):
            head = f'<p class="score"><strong>{e(p["note"])}/5</strong> sur {e(p.get("nb_avis",""))} avis {e(p.get("source_avis","Google"))}</p>'
        avis = head + '<div class="grid">' + "".join(
            f'<blockquote class="card"><p>« {e(a["texte"])} »</p><cite>— {e(a.get("prenom",""))}</cite></blockquote>' for a in p["avis"]) + "</div>"
    else:
        avis = '<p class="card">Vos avis clients s’afficheront ici. [avis à venir]</p>'
    horaires = "".join(f"<tr><th>{e(j)}</th><td>{e(h)}</td></tr>" for j, h in p.get("horaires", [])) or f"<tr><td>{TODO}</td></tr>"
    if cta == "devis":
        form = f'''<form class="card" onsubmit="event.preventDefault();this.innerHTML='<p><strong>Aperçu :</strong> sur le vrai site, votre demande arrive directement par e-mail.</p>'">
<label>Nom<input required autocomplete="name"></label><label>Téléphone<input required type="tel" autocomplete="tel"></label>
<label>Votre projet<textarea required rows="4"></textarea></label><button class="btn">{CTA[cta]}</button></form>'''
    else:
        form = ""
    main_btn = f'<a class="btn" href="#contact">{CTA[cta]}</a>' if cta != "appel" else f'<a class="btn" href="tel:{telh}">Appeler le {e(tel)}</a>'
    mail_line = f'<a href="mailto:{e(mail)}">{e(mail)}</a>' if mail else TODO
    legal = " · ".join(x for x in [nom, e(p["adresse"]) if p.get("adresse") else TODO,
                                    ("N° " + e(p["numero_entreprise"])) if p.get("numero_entreprise") else "N° d’entreprise " + TODO] if x)

    page = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>{metier} à {commune} — {nom}</title>
<meta name="description" content="{e(titre)}. {nom}, {metier.lower()} à {commune}.">
<style>
:root{{--m:{main};--d:{dark};--s:{soft};--t:#1d1d1f;--g:#5b5b62}}
*{{box-sizing:border-box}}body{{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--t);background:#fff}}
a{{color:var(--m)}}.w{{max-width:1080px;margin:0 auto;padding:0 16px}}
.demo{{background:#111;color:#fff;font-size:13px;text-align:center;padding:6px 16px}}
header{{position:sticky;top:0;background:#fff;border-bottom:1px solid #eee;z-index:5}}
header .w{{display:flex;align-items:center;justify-content:space-between;gap:12px;height:62px}}
.logo{{font-weight:800;font-size:19px;color:var(--d);text-decoration:none}}
nav a{{margin-left:18px;color:var(--t);text-decoration:none;font-size:15px}}nav .call{{color:var(--m);font-weight:700}}
.hero{{background:linear-gradient(135deg,var(--d),var(--m));color:#fff;padding:72px 0 64px}}
.hero h1{{font-size:clamp(30px,5vw,48px);line-height:1.15;margin:0 0 14px}}.hero p{{font-size:18px;max-width:640px;opacity:.95}}
.btn{{display:inline-block;background:var(--m);color:#fff;border:0;border-radius:10px;padding:14px 22px;font:700 16px system-ui;text-decoration:none;cursor:pointer}}
.hero .btn{{background:#fff;color:var(--d);margin-top:14px}}
section{{padding:56px 0}}section.alt{{background:var(--s)}}h2{{font-size:28px;margin:0 0 22px;color:var(--d)}}
.grid{{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}}
.card{{background:#fff;border:1px solid #e6e6ea;border-radius:14px;padding:20px;margin:0}}.card h3{{margin:0 0 6px;color:var(--d)}}
.alt .card{{border-color:transparent}}cite{{color:var(--g);font-style:normal}}.score{{font-size:18px}}
figure{{margin:0;border-radius:14px;overflow:hidden;aspect-ratio:4/3;background:#ddd}}figure img{{width:100%;height:100%;object-fit:cover;display:block}}
.ph{{display:flex;align-items:center;justify-content:center;text-align:center;color:var(--g);background:repeating-linear-gradient(45deg,#f2f2f4,#f2f2f4 12px,#e9e9ee 12px,#e9e9ee 24px)}}
ul.ok{{padding:0;list-style:none}}ul.ok li{{padding-left:28px;position:relative;margin:8px 0}}ul.ok li:before{{content:"✓";position:absolute;left:0;color:var(--m);font-weight:800}}
table{{border-collapse:collapse}}th,td{{text-align:left;padding:6px 16px 6px 0}}
label{{display:block;margin-bottom:12px;font-weight:600}}input,textarea{{display:block;width:100%;margin-top:4px;padding:11px;border:1px solid #cfcfd6;border-radius:8px;font:inherit}}
.todo{{background:#fff3c4;color:#6b4e00;padding:0 4px;border-radius:4px}}
footer{{background:var(--d);color:#e8e8ee;padding:28px 0 90px;font-size:14px}}footer a{{color:#fff}}
.bar{{position:fixed;left:0;right:0;bottom:0;display:none;gap:8px;padding:10px 16px;background:#fff;border-top:1px solid #eee}}
.bar a{{flex:1;text-align:center;padding:12px;border-radius:10px;text-decoration:none;font-weight:700}}.bar .p{{background:var(--m);color:#fff}}.bar .s{{border:1px solid #cfcfd6;color:var(--t)}}
@media(max-width:720px){{nav a:not(.call){{display:none}}.bar{{display:flex}}section{{padding:42px 0}}}}
</style></head><body>
<div class="demo">Aperçu de démonstration préparé pour {nom} — ce site n’est pas encore en ligne.</div>
<header><div class="w"><a class="logo" href="#">{nom}</a><nav><a href="#services">Services</a><a href="#realisations">Réalisations</a><a href="#avis">Avis</a><a href="#contact">Contact</a><a class="call" href="tel:{telh}">{e(tel)}</a></nav></div></header>
<div class="hero"><div class="w"><h1>{e(titre)}</h1><p>{e(intro) or (metier + " à " + commune + " et environs.")}</p>{main_btn}</div></div>
<section id="services"><div class="w"><h2>Nos services</h2><div class="grid">{services}</div></div></section>
<section id="realisations" class="alt"><div class="w"><h2>Réalisations</h2><div class="grid">{photos}</div></div></section>
{f'<section><div class="w"><h2>Pourquoi nous choisir</h2><ul class="ok">{atouts}</ul></div></section>' if atouts else ''}
<section id="avis" class="alt"><div class="w"><h2>Avis clients</h2>{avis}</div></section>
<section id="contact"><div class="w grid"><div><h2>Contact</h2>
<p><strong>Téléphone :</strong> <a href="tel:{telh}">{e(tel)}</a><br><strong>E-mail :</strong> {mail_line}<br>
<strong>Zone d’intervention :</strong> {e(p["zone"]) if p.get("zone") else TODO}</p>
<table>{horaires}</table></div>{form}</div></section>
<footer><div class="w"><p>{legal}</p><p>Mentions légales · Politique de confidentialité · Conditions d’utilisation</p></div></footer>
<div class="bar">{f'<a class="p" href="#contact">{CTA[cta]}</a><a class="s" href="tel:{telh}">Appeler</a>' if cta != "appel" else f'<a class="p" href="tel:{telh}">Appeler</a>'}</div>
</body></html>'''
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, p["slug"] + ".html")
    open(path, "w", encoding="utf-8").write(page)
    print(f"{path}  ({len(page)//1024} Ko)  →  https://vitroom.be/apercu/{p['slug']}")


if __name__ == "__main__":
    for f in sys.argv[1:]:
        build(f)

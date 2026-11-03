#!/usr/bin/env python3
"""Prépare le mail de prospection (et sa relance) à partir de la fiche JSON d'un aperçu.

Utilisation :  python3 tools/mail_prospect.py fiche.json [fiche2.json ...]
Sortie       :  une ligne JSON par fiche : {"slug","to","subject","body","htmlBody","relance_subject","relance_body","relance_html"}

Champs utilisés dans la fiche (en plus de ceux d'apercu.py) :
  mail_prospect (destinataire), civilite_nom (ex. "Monsieur Dupont", vide = « Bonjour, »),
  observation (UNE phrase vraie et vérifiée), jour_appel (ex. "jeudi"), pays ("BE" ou "FR"),
  date_mail (pour la relance, ex. "5 novembre"), nouveau (élément nouveau pour la relance, une phrase),
  benefice (facultatif : phrase sur ce que le site apporterait à CE métier, sinon phrase générale)
"""
import html, json, sys

SIGN_TXT = "Bien à vous,\nSylvain Robinet\nVitroom · Création de sites internet\nwww.vitroom.be\ncontact@vitroom.be\n{tel}"
SIGN_HTML = ('<p>Bien à vous,<br>Sylvain Robinet<br>Vitroom · Création de sites internet<br>'
             '<a href="https://vitroom.be">www.vitroom.be</a><br>'
             '<a href="mailto:contact@vitroom.be">contact@vitroom.be</a><br>'
             '<a href="tel:+32470537008">{tel}</a></p>')
NON = "Si ce n'est pas le bon moment, un simple « non merci » suffit : nous ne vous recontacterons pas."


def build(f):
    p = json.load(open(f, encoding="utf-8"))
    nom, slug = p["nom"], p["slug"]
    de = "d'" if nom[:1].lower() in "aeiouyhéèêàâîôû" else "de "
    tel = "0470 53 70 08" if p.get("pays", "BE") == "BE" else "+32 470 53 70 08"
    lien = f"https://vitroom.be/apercu/{slug}"
    bonjour = f"Bonjour {p['civilite_nom']}," if p.get("civilite_nom") else "Bonjour,"
    jour = p.get("jour_appel", "dans deux jours")
    paras = [
        bonjour,
        p["observation"],
        "Vitroom crée des sites internet pour les artisans, indépendants et petites entreprises : clairs, rapides, "
        "lisibles sur téléphone et pensés pour être trouvés sur Google. Nous nous occupons de tout, de la création "
        "à la mise en ligne, puis des mises à jour du site. Nous pouvons aussi créer ou améliorer votre fiche Google, "
        "pour que vous apparaissiez sur Google Maps quand on cherche votre métier.",
        p.get("benefice") or ("Concrètement, vos futurs clients vous trouveraient plus facilement, verraient vos réalisations "
                              "et vos avis, et pourraient vous demander un devis directement, sans intermédiaire."),
        f"Nous avons préparé un aperçu de ce que pourrait être le site {de}{nom}, à partir des informations déjà publiques : {lien}",
        f"Cela ne vous engage à rien. Nous vous appelons {jour} pour avoir votre avis (15 minutes au téléphone ou en visio), "
        "ou répondez simplement à ce mail.",
        NON,
    ]
    esc = lambda s: html.escape(s, quote=False)
    body = "\n\n".join(paras) + "\n\n" + SIGN_TXT.format(tel=tel)
    hp = [esc(x) for x in paras]
    hp[4] = esc(paras[4].replace(lien, "")) + f'<a href="{lien}">{lien.replace("https://", "")}</a>'
    htmlb = "".join(f"<p>{x}</p>" for x in hp) + SIGN_HTML.format(tel=tel)
    subject = f"Un aperçu du site {de}{nom}"
    rel = [bonjour,
           f"Nous nous permettons de revenir vers vous au sujet de notre message du {p.get('date_mail', '[date]')}.",
           (p.get("nouveau", "") + " " if p.get("nouveau") else "") + f"L'aperçu reste disponible ici : {lien}",
           NON]
    rel_body = "\n\n".join(rel) + "\n\n" + SIGN_TXT.format(tel=tel)
    rh = [esc(x) for x in rel]
    rh[2] = esc(rel[2].replace(lien, "")) + f'<a href="{lien}">{lien.replace("https://", "")}</a>'
    rel_html = "".join(f"<p>{x}</p>" for x in rh) + SIGN_HTML.format(tel=tel)
    print(json.dumps({"slug": slug, "to": p.get("mail_prospect", ""), "subject": subject, "body": body, "htmlBody": htmlb,
                      "relance_subject": "Re: " + subject, "relance_body": rel_body, "relance_html": rel_html},
                     ensure_ascii=False))


if __name__ == "__main__":
    for f in sys.argv[1:]:
        build(f)

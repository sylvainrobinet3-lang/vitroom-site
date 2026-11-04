#!/usr/bin/env python3
"""Prépare le mail de prospection (et sa relance) à partir de la fiche JSON d'un aperçu.

Utilisation :  python3 tools/mail_prospect.py fiche.json [fiche2.json ...]
Sortie       :  une ligne JSON par fiche : {"slug","to","subject","body","htmlBody","relance_subject","relance_body","relance_html"}

Champs utilisés dans la fiche (en plus de ceux d'apercu.py) :
  mail_prospect (destinataire), civilite_nom (ex. "Monsieur Dupont", vide = « Bonjour, »),
  observation (UNE phrase vraie et vérifiée), jour_appel (ex. "jeudi"), pays ("BE" ou "FR"),
  date_mail (pour la relance, ex. "5 novembre"), nouveau (élément nouveau pour la relance, une phrase),
  benefice (facultatif : une phrase de plus sur ce que le site apporterait à CE métier),
  pitch_qui / pitch_resultat (facultatifs : remplacent la phrase d'accroche déduite du métier)

Accroche en 4 morceaux (méthode du 04-11-2026) : POUR QUI (le métier, au pluriel) + RÉSULTAT concret
(devis, réservations, rendez-vous) + DÉLAI + RISQUE ZÉRO (il voit son site avant de s'engager).
On ne dit jamais « je crée des sites » : on parle de ce que ça change pour lui.
"""
import html, json, sys

SIGN_TXT = "Bien à vous,\nSylvain Robinet\nVitroom · Création de sites internet\nwww.vitroom.be\ncontact@vitroom.be\n{tel}"
SIGN_HTML = ('<p>Bien à vous,<br>Sylvain Robinet<br>Vitroom · Création de sites internet<br>'
             '<a href="https://vitroom.be">www.vitroom.be</a><br>'
             '<a href="mailto:contact@vitroom.be">contact@vitroom.be</a><br>'
             '<a href="tel:+32470537008">{tel}</a></p>')
DELAI = "3 à 5 jours"

# (mots-clés dans le métier, pour qui, résultat)
PITCH = [
    (("hôtel", "hotel", "gîte", "gite", "chambre d'hôte", "b&b"), "les hôtels et gîtes indépendants", "à prendre des réservations en direct, sans commission"),
    (("restaurant", "brasserie", "café", "pizzeria", "friterie"), "les restaurants", "à remplir leurs tables avec des réservations en direct, sans commission"),
    (("traiteur", "réception", "salle"), "les traiteurs et salles de réception", "à recevoir des demandes d'offre pour des mariages et des fêtes, en direct"),
    (("coiff", "esthét", "beauté", "barbier", "onglerie", "massage", "kiné"), "les salons et indépendants du bien-être", "à remplir leur agenda avec des rendez-vous pris en ligne"),
    (("garage", "carross", "mécani", "pneu"), "les garages", "à recevoir des demandes de rendez-vous et de devis en direct, de conducteurs du coin"),
    (("toit", "couv", "zinguer", "charpent"), "les couvreurs", "à recevoir des demandes de devis de gens qui ont déjà vu leurs chantiers, avant même de les appeler"),
    (("paysag", "jardin", "élagage", "elagage", "terrass"), "les paysagistes", "à recevoir des demandes de devis de propriétaires qui ont déjà vu leurs jardins, avant même de les appeler"),
    (("châssis", "chassis", "menuis", "cuisin", "placard", "escalier"), "les menuisiers et cuisinistes", "à recevoir des demandes de devis de clients qui ont déjà vu leurs réalisations"),
    (("carrel", "salle de bain", "sanitaire", "plomb"), "les artisans de la salle de bain et du carrelage", "à recevoir des demandes de devis de clients qui ont déjà vu leurs réalisations"),
    (("chauff", "électri", "electri", "pompe à chaleur", "photovolt"), "les chauffagistes et électriciens", "à recevoir des demandes d'intervention et de devis de gens du coin qui cherchent quelqu'un de sérieux"),
    (("rénov", "renov", "construct", "maçon", "macon", "façade", "isol", "entreprise générale"), "les entreprises de rénovation", "à recevoir des demandes de devis de gens qui ont déjà vu leurs chantiers, avant même de les appeler"),
]
PITCH_DEFAUT = ("les artisans et indépendants", "à recevoir des demandes de devis en direct, de gens qui les ont trouvés sur Google")


def pitch(p):
    if p.get("pitch_qui") and p.get("pitch_resultat"):
        return p["pitch_qui"], p["pitch_resultat"]
    m = (p.get("metier") or "").lower()
    for keys, qui, res in PITCH:
        if any(k in m for k in keys):
            return qui, res
    return PITCH_DEFAUT


NON = "Si ce n'est pas le bon moment, un simple « non merci » suffit : je ne vous recontacterai pas."


def build(f):
    p = json.load(open(f, encoding="utf-8"))
    nom, slug = p["nom"], p["slug"]
    de = "d'" if nom[:1].lower() in "aeiouyhéèêàâîôû" else "de "
    tel = "0470 53 70 08" if p.get("pays", "BE") == "BE" else "+32 470 53 70 08"
    lien = f"https://vitroom.be/apercu/{slug}"
    bonjour = f"Bonjour {p['civilite_nom']}," if p.get("civilite_nom") else "Bonjour,"
    jour = p.get("jour_appel", "dans deux jours")
    qui, res = pitch(p)
    paras = [
        bonjour,
        p["observation"],
        f"J'aide {qui} {res}, avec un site en ligne en {DELAI}.",
        f"Et vous ne prenez aucun risque : vous voyez votre site avant de vous engager. J'ai déjà préparé celui {de}{nom}, "
        f"à partir des informations publiques : {lien}",
    ]
    if p.get("benefice"):
        paras.append(p["benefice"])
    paras += [
        f"Je vous appelle {jour} pour avoir votre avis (15 minutes au téléphone ou en visio), ou répondez simplement à ce mail.",
        NON,
    ]
    esc = lambda s: html.escape(s, quote=False)
    body = "\n\n".join(paras) + "\n\n" + SIGN_TXT.format(tel=tel)
    hp = [esc(x) for x in paras]
    hp[3] = esc(paras[3].replace(lien, "")) + f'<a href="{lien}">{lien.replace("https://", "")}</a>'
    htmlb = "".join(f"<p>{x}</p>" for x in hp) + SIGN_HTML.format(tel=tel)
    subject = f"Un aperçu du site {de}{nom}"
    rel = [bonjour,
           f"Je me permets de revenir vers vous au sujet de mon message du {p.get('date_mail', '[date]')}.",
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

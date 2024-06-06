import { describe, it, expect, test } from 'vitest';
import { getLastIndexOf, getHtmlPosition } from './Template'; // Stellen Sie sicher, dass Sie den korrekten Pfad zur Datei angeben

const html = /* html */ `
<!DOCTYPE html>
<html lang="de">
<head>
    <!-- Meta-Daten für die Website -->
    <!-- Meta-Daten für die Website -->
    <meta charset="UTF-8">
    <!-- Festlegen der Zeichencodierung auf UTF-8 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Responsives Design für mobile Geräte -->
    <title>Komplexe HTML-Seite mit vielen Kommentaren</title>
    <!-- Einbinden von CSS-Stilen für die gesamte Seite -->
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- 
        Header-Bereich der Seite
        Header-Bereich der Seite
        Header-Bereich der Seite
    -->
    <!-- Einbinden von CSS-Stilen für die gesamte Seite -->
    <!-- 
        Header-Bereich der Seite
        Header-Bereich der Seite
        Header-Bereich der Seite
    -->
    <header>
        <h1>Willkommen auf meiner Website</h1>
        <!-- Navigationselement -->
        <nav>
            <ul>
                <li><a href="#home">Home</a></li> <!-- Link zum Home-Bereich -->
                <li><a href="#about">Über uns</a></li> <!-- Link zum Über uns-Bereich -->
                <li><a href="#services">Dienstleistungen</a></li> <!-- Link zu den Dienstleistungen -->
                <li><a href="#contact">Kontakt</a></li> <!-- Link zum Kontakt-Bereich -->
            </ul>
        </nav>
    </header>

    <!-- Hauptinhalt der Seite -->
    <!-- Hauptinhalt der Seite -->
    <main>
        <!-- Abschnitt über das Unternehmen -->
        <section id="about">
            <h2>Über uns</h2>
            <p>Wir sind ein innovatives Unternehmen, das sich auf Webentwicklung spezialisiert hat.</p>
            <!-- Bild des Unternehmens -->
            <img src="company.jpg" alt="Unser Unternehmen">
        </section>

        <!-- Dienstleistungen -->
        <section id="services">
            <h2>Unsere Dienstleistungen</h2>
            <!-- Artikel 1: Webdesign -->
            <article>
                <h3>Webdesign</h3>
                <p>Wir gestalten ansprechende und benutzerfreundliche Webseiten.</p>
            </article>
            <!-- Artikel 2: SEO -->
            <article>
                <h3>SEO</h3>
                <p>Unsere SEO-Experten helfen Ihnen, in den Suchmaschinen besser gefunden zu werden.</p>
            </article>
            <!-- Artikel 3: Marketing -->
            <article>
                <h3>Marketing</h3>
                <p>Wir entwickeln maßgeschneiderte Marketingstrategien für Ihr Unternehmen.</p>
            </article>
        </section>
    </main>

    <!-- Kontaktformular -->
    <section id="contact">
        <h2>Kontakt</h2>
        <!-- Formular zur Übermittlung von Kontaktanfragen -->
        <form action="submit_form.php" method="post">
            <!-- Eingabefeld für den Namen des Benutzers -->
            <label for="name">Name:</label>
            <input type="text" id="name" name="name" required>
            <!-- Eingabefeld für die E-Mail-Adresse des Benutzers -->
            <label for="email">E-Mail:</label>
            <input type="email" id="email" name="email" required>
            <!-- Textbereich für die Nachricht des Benutzers -->
            <label for="message">Nachricht:</label>
            <textarea id="message" name="message" rows="4" required></textarea>
            <!-- Absenden-Button -->
            <button type="submit">Absenden</button>
        </form>
    </section>

    <!-- Footer-Bereich -->
    <footer>
        <!-- Urheberrechtshinweis -->
        <p>&copy; 2024 Mein Unternehmen. Alle Rechte vorbehalten.</p>
        <!-- Jahr und Unternehmensname -->
    </footer>

    <!-- Einbinden von JavaScript-Dateien -->
    <script src="scripts.js"></script>
    <!-- Stellt sicher, dass die JavaScript-Funktionalität korrekt eingebunden ist -->
</body>
</html>
`;

test('getHtmlPosition', {}, () => {
    const htmlStr = /* html */ `
        <div>
            <!-- <button></button> -->
    `;
    const pos = getHtmlPosition(htmlStr);
    expect(pos).toBe(0);
});

// describe('getLastIndexOf', () => {
//     it('should return the last index of delimiter with no exclusions', () => {
//         const str = 'a,b,c,d,e,f';
//         const delim = ',';
//         const excludeLeft = '';
//         const excludeRight = '';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(9);
//     });

//     it('should return the last index of delimiter excluding specific left context', () => {
//         const str = 'a,b,c,d,e,f';
//         const delim = ',';
//         const excludeLeft = 'd';
//         const excludeRight = '';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(7);
//     });

//     it('should return the last index of delimiter excluding specific right context', () => {
//         const str = 'a,b,c,d,e,f';
//         const delim = ',';
//         const excludeLeft = '';
//         const excludeRight = 'e';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(5);
//     });

//     it('should handle whitespace correctly', () => {
//         const str = 'a , b , c , d , e , f';
//         const delim = ',';
//         const excludeLeft = '';
//         const excludeRight = '';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(17);
//     });

//     it('should handle intermediate delimiters and whitespace', () => {
//         const str = 'a, b , c, d , e, f';
//         const delim = ',';
//         const excludeLeft = ' d';
//         const excludeRight = '';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(14);
//     });

//     it('should return -1 if no matching delimiter is found', () => {
//         const str = 'abcdef';
//         const delim = ',';
//         const excludeLeft = '';
//         const excludeRight = '';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(-1);
//     });

//     it('should handle exclusion when left and right contexts are specified', () => {
//         const str = 'a,b,c,d,e,f';
//         const delim = ',';
//         const excludeLeft = 'c';
//         const excludeRight = 'e';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(5);
//     });

//     it('should handle edge case with no delimiters present', () => {
//         const str = 'abcdef';
//         const delim = ',';
//         const excludeLeft = 'a';
//         const excludeRight = 'f';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(-1);
//     });

//     it('should handle edge case with only delimiters present', () => {
//         const str = ',,,,,,';
//         const delim = ',';
//         const excludeLeft = '';
//         const excludeRight = '';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(5);
//     });

//     it('should find the last ">" in an HTML string that is not within a comment', () => {
//         const str = '<html><!-- comment --><body></body></html>';
//         const delim = '>';
//         const excludeLeft = '--';
//         const excludeRight = '';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(32);
//     });

//     it('should find the last "<" in an HTML string that is not within a comment', () => {
//         const str = '<html><!-- comment --><body></body></html>';
//         const delim = '<';
//         const excludeLeft = '--';
//         const excludeRight = '';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(24);
//     });

//     it('should handle longer excludeLeft and excludeRight strings', () => {
//         const str = 'a,b,c,excludeThis,d,e,f';
//         const delim = ',';
//         const excludeLeft = 'excludeThis';
//         const excludeRight = '';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(9);
//     });

//     it('should handle multiple exclusions with both left and right contexts', () => {
//         const str = 'a,b,c,excludeThis,d,e,excludeThis,f';
//         const delim = ',';
//         const excludeLeft = 'excludeThis';
//         const excludeRight = 'f';
//         const result = getLastIndexOf(str, excludeLeft, delim, excludeRight);
//         expect(result).toBe(9);
//     });
// });

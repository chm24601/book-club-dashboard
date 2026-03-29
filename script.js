{\rtf1\ansi\ansicpg1252\cocoartf2709
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 async function loadBooks() \{\
  try \{\
    const response = await fetch("/api/books");\
    const data = await response.json();\
\
    const container = document.getElementById("books-container");\
\
    container.innerHTML = "";\
\
    data.records.forEach(record => \{\
      const book = record.fields;\
\
      const div = document.createElement("div");\
      div.className = "book-card";\
\
      div.innerHTML = `\
        <h2>$\{book.Title || "No title"\}</h2>\
        <p><strong>Author:</strong> $\{book.Author || "Unknown"\}</p>\
        <p><strong>Year:</strong> $\{book.PublishedYear || "-"\}</p>\
        <p>$\{book.Summary || ""\}</p>\
      `;\
\
      container.appendChild(div);\
    \});\
\
  \} catch (error) \{\
    console.error("Error loading books:", error);\
  \}\
\}\
\
loadBooks();}
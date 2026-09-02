import { describe, it, expect } from 'vitest'
import { parseMDTest } from '@/utils/parseMDTest'

// Format A: options on separate lines, solutions on separate lines
const FORMAT_A = `
1. ¿Cuál es la capital de España?
A) Barcelona
B) Madrid
C) Sevilla
D) Valencia

2. ¿Cuántos colores tiene el arcoíris?
A) Cinco
B) Seis
C) Siete
D) Ocho

HOJA DE SOLUCIONES
1 B
2 C
`

// Format B: options inline on same line as question, solutions on same line as header
const FORMAT_B = `
1. ¿Cuál es la capital de España? A) Barcelona B) Madrid C) Sevilla D) Valencia

2. ¿Cuántos colores tiene el arcoíris? A) Cinco B) Seis C) Siete D) Ocho

HOJA DE SOLUCIONES 1 B 2 C
`

// Format B with 30 questions (simulate the LGTBI law exam)
const FORMAT_B_LONG = `
1. Según el artículo 1, ¿cuál es la finalidad de la ley? A) Opción errónea 1 B) Opción correcta C) Opción errónea 3 D) Opción errónea 4

2. ¿Cuál es el ámbito de aplicación? A) Correcta ámbito B) Errónea 2 C) Errónea 3 D) Errónea 4

HOJA DE SOLUCIONES 1 B 2 A
`

// Format with question using numbered sub-article references like "artículo 3.a)"
const FORMAT_LOWERCASE_REFS = `
1. Conforme al artículo 3.a) de la ley, en el caso de personas con discapacidad, ¿qué conducta se considera discriminación directa? A) La denegación de ajustes razonables B) El despido objetivo C) La no inclusión en formación D) La exigencia de acreditación del 33%

HOJA DE SOLUCIONES 1 A
`

// Format: solutions distributed across multiple lines
const FORMAT_MULTILINE_SOLUTIONS = `
1. Pregunta uno A) Opt A B) Opt B C) Opt C D) Opt D
2. Pregunta dos A) Opt A B) Opt B C) Opt C D) Opt D
3. Pregunta tres A) Opt A B) Opt B C) Opt C D) Opt D

HOJA DE SOLUCIONES
1 C 2 A 3 D
`

describe('parseMDTest — formato A (opciones en líneas separadas)', () => {
  it('parsea 2 preguntas correctamente', () => {
    const result = parseMDTest(FORMAT_A)
    expect(result).toHaveLength(2)
  })

  it('asigna la respuesta correcta (B para pregunta 1)', () => {
    const result = parseMDTest(FORMAT_A)
    const q1 = result[0]
    expect(q1.text).toContain('capital de España')
    const correctOpt = q1.options.find(o => o.correct)
    expect(correctOpt.text).toContain('Madrid')
  })

  it('asigna la respuesta correcta (C para pregunta 2)', () => {
    const result = parseMDTest(FORMAT_A)
    const q2 = result[1]
    const correctOpt = q2.options.find(o => o.correct)
    expect(correctOpt.text).toContain('Siete')
  })

  it('genera 4 opciones por pregunta', () => {
    const result = parseMDTest(FORMAT_A)
    for (const q of result) {
      expect(q.options).toHaveLength(4)
    }
  })
})

describe('parseMDTest — formato B (opciones inline, soluciones inline)', () => {
  it('parsea 2 preguntas del formato inline', () => {
    const result = parseMDTest(FORMAT_B)
    expect(result).toHaveLength(2)
  })

  it('extrae el texto de la pregunta sin las opciones', () => {
    const result = parseMDTest(FORMAT_B)
    expect(result[0].text).toBe('¿Cuál es la capital de España?')
    expect(result[0].text).not.toContain('A)')
  })

  it('genera 4 opciones por pregunta (formato inline)', () => {
    const result = parseMDTest(FORMAT_B)
    for (const q of result) {
      expect(q.options).toHaveLength(4)
    }
  })

  it('asigna la respuesta correcta (B=Madrid para pregunta 1)', () => {
    const result = parseMDTest(FORMAT_B)
    const correct = result[0].options.find(o => o.correct)
    expect(correct.text).toContain('Madrid')
  })

  it('asigna la respuesta correcta (C=Siete para pregunta 2)', () => {
    const result = parseMDTest(FORMAT_B)
    const correct = result[1].options.find(o => o.correct)
    expect(correct.text).toContain('Siete')
  })

  it('cada pregunta tiene exactamente una opción correcta', () => {
    const result = parseMDTest(FORMAT_B)
    for (const q of result) {
      expect(q.options.filter(o => o.correct)).toHaveLength(1)
    }
  })
})

describe('parseMDTest — referencias a artículos con letras minúsculas (artículo 3.a))', () => {
  it('no confunde referencias "artículo 3.a)" con la opción A)', () => {
    const result = parseMDTest(FORMAT_LOWERCASE_REFS)
    expect(result).toHaveLength(1)
    expect(result[0].text).toContain('artículo 3.a)')
    expect(result[0].options).toHaveLength(4)
    const correct = result[0].options.find(o => o.correct)
    expect(correct.text).toContain('denegación de ajustes razonables')
  })
})

describe('parseMDTest — soluciones en múltiples pares por línea', () => {
  it('parsea soluciones distribuidas en una sola línea ("1 C 2 A 3 D")', () => {
    const result = parseMDTest(FORMAT_MULTILINE_SOLUTIONS)
    expect(result).toHaveLength(3)
    expect(result[0].options.find(o => o.correct).text).toContain('Opt C')
    expect(result[1].options.find(o => o.correct).text).toContain('Opt A')
    expect(result[2].options.find(o => o.correct).text).toContain('Opt D')
  })
})

describe('parseMDTest — formato B largo (preguntas numeradas hasta 30+)', () => {
  it('parsea preguntas con número de dos dígitos correctamente', () => {
    const result = parseMDTest(FORMAT_B_LONG)
    expect(result).toHaveLength(2)
    expect(result[0].options.find(o => o.correct).text).toContain('Opción correcta')
    expect(result[1].options.find(o => o.correct).text).toContain('Correcta ámbito')
  })
})

describe('parseMDTest — sin sección de soluciones', () => {
  it('cae al fallback options[0].correct=true cuando no hay soluciones', () => {
    const text = `1. Pregunta sin solución A) Primera opción B) Segunda C) Tercera D) Cuarta`
    const result = parseMDTest(text)
    expect(result).toHaveLength(1)
    expect(result[0].options[0].correct).toBe(true)
  })
})

describe('parseMDTest — propiedades de salida', () => {
  it('cada pregunta tiene id, type, text, options', () => {
    const result = parseMDTest(FORMAT_B)
    for (const q of result) {
      expect(q.id).toBeTruthy()
      expect(q.type).toBe('single')
      expect(typeof q.text).toBe('string')
      expect(Array.isArray(q.options)).toBe(true)
    }
  })
})

// ── PLATERCAM real exam (30 questions, options on next line) ──────────────────

const PLATERCAM_MD = `
1. En relacion con las funciones de los Grupos de Accion, a que grupo corresponde la realizacion del triaje inicial en zona no segura cuando no sea posible la extraccion de las victimas
A) Al Grupo Sanitario B) Al Grupo de Intervencion C) Al Grupo de Seguridad D) Al Grupo de Apoyo Logistico

2. Segun las funciones detalladas en el apartado 4.2.6, que organo tiene atribuida la funcion de coordinar la actuacion de las aeronaves pilotadas por control remoto regulando su acceso, zona de vuelo y funciones
A) El Director de Operaciones B) El Director del Plan C) El Jefe del Puesto de Mando Avanzado D) El responsable del Grupo de Seguridad

3. Segun las funciones de la direccion del plan, quien tiene atribuida de forma expresa la funcion de autorizar y en su caso ordenar el uso de aeronaves pilotadas por control remoto para la gestion de la emergencia
A) El Director de Operaciones B) El Jefe del PMA C) El Director del Plan D) El Jefe del Grupo de Intervencion

4. De que grupo de accion es funcion especifica organizar el voluntariado a medida que se vaya incorporando a la zona de la emergencia
A) Del Grupo de Seguridad B) Del Grupo Sanitario C) Del Grupo de Apoyo Logistico D) Del Grupo de Intervencion

5. Bajo que circunstancia expresa el Grupo Sanitario puede efectuar la entrada a la zona de peligro en una emergencia gestionada por el PLATERCAM
A) Bajo la autorizacion del Jefe del PMA B) De manera autonoma segun la valoracion medica de la primera unidad movil C) Previa autorizacion del Director de Operaciones en el CECOP D) Solo cuando se declare formalmente la situacion 2 de emergencia

6. Segun el apartado 4.2.7.3, en quien recaeran el mando y la coordinacion del Grupo Sanitario hasta la llegada del Jefe de Guardia del SUMMA 112 al lugar de intervencion
A) En el medico del primer recurso de soporte vital basico B) En el facultativo designado por el Colegio Oficial de Medicos de Madrid C) En el medico del primer recurso avanzado que acuda al area afectada D) En el responsable del Grupo de Intervencion de forma interina

7. Segun el plan, cual de las siguientes situaciones no determina que el CECOP empiece a funcionar de manera integrada como CECOPI
A) Cuando se integran los mandos de las diferentes Administraciones para la direccion y coordinacion de la emergencia B) Cuando se declare formalmente la situacion 1 de emergencia con activacion del PMA C) Cuando se declaren situaciones de interes nacional D) Cuando la emergencia originada necesite de medios ajenos a los asignados al Plan

8. De quien depende jerarquica, juridica, economica, organica y funcionalmente la Agrupacion Municipal de Voluntarios de Proteccion Civil constituida segun el PLATERCAM
A) Del ayuntamiento en el que se constituya B) De la Consejeria competente en materia de proteccion civil de la Comunidad de Madrid C) De la Comision de Proteccion Civil de la Comunidad de Madrid D) De la Delegacion del Gobierno en Madrid

9. Cual es el requisito sine qua non para que el Ayuntamiento de Madrid pueda asumir la direccion del plan en las situaciones 0, 1 y 2 ante una emergencia limitada a su termino municipal
A) El informe favorable vinculante del Delegado del Gobierno B) El previo consentimiento del Consejero competente en materia de proteccion civil de la Comunidad de Madrid C) La aprobacion por mayoria absoluta del Pleno del Ayuntamiento de Madrid D) La ratificacion de la Comision de Proteccion Civil de la Comunidad de Madrid

10. En las situaciones operativas 0, 1 y 2, quien debera incorporarse obligatoriamente al CECOP constituido por el municipio de Madrid en caso de asuncion de la direccion del plan por este
A) El Director de Operaciones de la Comunidad de Madrid B) Un representante de la Comunidad de Madrid C) El Delegado del Gobierno en Madrid D) El Jefe de Guardia del SUMMA 112

11. Segun el apartado 4.2.2.1, que sucede si el municipio de Madrid asume la direccion del plan en las situaciones 0, 1 y 2 pero no tuviera las competencias sobre alguna materia especifica en la emergencia
A) Las competencias seran asumidas de forma automatica por la Administracion General del Estado B) Se incorporaran en el CECOP los representantes de las Consejerias competentes en la misma C) La direccion del plan se transferira de forma inmediata al Director General de Proteccion Civil D) Se requerira la intervencion del Comite de Direccion conjunto en situacion 1

12. Como debe canalizar el Ayuntamiento de Madrid sus solicitudes de cualquier tipo de medio y recurso que no sea de su titularidad o de entidad dependiente cuando asuma la direccion del plan
A) Directamente al Ministerio de Defensa B) A traves de la Delegacion del Gobierno de la Comunidad de Madrid C) A traves de la Agencia de Seguridad y Emergencias Madrid 112 D) Mediante requerimiento directo al CECOP central de la Comunidad de Madrid

13. Cual es la definicion tecnica exacta que el PLATERCAM otorga al concepto de Amenaza en su apartado 1.4
A) Probabilidad de que se produzcan daños en una zona o lugar determinados y que afecte a bienes B) Caracteristica de una colectividad de personas que la hace susceptible de ser afectada por un peligro C) Situacion en la que personas y bienes y/o medio ambiente estan expuestos en mayor o menor medida a un peligro inminente o latente D) Potencial de ocasionar daño en determinadas situaciones a colectivos de personas o bienes

14. Que concepto se define tecnicamente en el plan como el potencial de ocasionar daño en determinadas situaciones a colectivos de personas o bienes que deben ser preservados por la proteccion civil
A) Amenaza B) Peligro C) Riesgo D) Vulnerabilidad

15. Cual es la definicion literal de Riesgo recogida en el apartado de definiciones del PLATERCAM
A) Exposicion inminente de personas y bienes a un peligro latente o de gran magnitud B) Probabilidad de que se produzcan daños en una zona o lugar determinados y que llegue a afectar a colectivos de personas o a bienes C) Potencial de ocasionar daño en determinadas situaciones a colectivos de personas D) Caracteristica de una colectividad que la hace susceptible de ser afectada por un peligro

16. Como se define tecnicamente en el glosario la situacion o acontecimiento que altera o interrumpe sustancialmente el funcionamiento de una comunidad o sociedad por ocasionar gran cantidad de victimas y cuya atencion supera los medios disponibles de la propia comunidad
A) Catastrofe B) Emergencia de proteccion civil C) Peligro inminente D) Siniestro extraordinario

17. Segun el glosario de definiciones, que es la Vulnerabilidad
A) El area de maximo peligro donde debe hacerse un riguroso control de accesos B) La probabilidad de que se produzcan daños en una zona determinada C) La caracteristica de una colectividad de personas, bienes o medio ambiente, que los hacen susceptibles de ser afectados en mayor o menor grado por un peligro en determinadas circunstancias D) La falta de recursos e infraestructuras basicas en un municipio afectado por una catastrofe

18. Segun las especificaciones tecnicas del Confinamiento, el desplazamiento de la poblacion hacia los edificios o recintos designados debe realizarse obligatoriamente
A) Utilizando vehiculos electricos B) A pie C) En transportes colectivos autorizados D) En un tiempo maximo de 15 minutos

19. Conforme a las directrices de la medida de Alejamiento, en que supuesto especifico se debe evitar expresamente el uso de automoviles, motocicletas u otros vehiculos de motor por parte de la poblacion
A) En caso de inundaciones lentas en zonas urbanas B) En caso de fugas de sustancias inflamables sin incendio C) En situaciones de prealerta por fuertes rachas de viento D) En caso de emergencias por nevadas intensas en puertos de montaña

20. Cual es una de las ventajas esenciales que presenta la medida de Alejamiento frente a la de Evacuacion segun el apartado 5.3.4
A) Que la poblacion trasladada es inferior, se realiza con sus propios medios y las necesidades logisticas son menores, aplicandose con mayor celeridad B) Que garantiza el albergue definitivo de emergencia de forma permanente C) Que exime al Grupo de Seguridad de realizar el control de las vias de alejamiento D) Que se puede declarar de forma automatica por el Jefe del PMA sin consultar al Director del Plan

21. Segun el plan, en que circunstancia unica se justifica la adopcion de la medida de Evacuacion de la poblacion afectada
A) Siempre que se declare formalmente la situacion 1 de emergencia B) Unicamente si el peligro al que esta expuesta la poblacion es elevado C) Cuando lo decida de forma unilateral el Jefe del PMA D) Si los recursos municipales se encuentran totalmente agotados

22. Por quien debera ser tomada siempre la decision de realizar una evacuacion de la poblacion afectada
A) Por el Jefe del PMA de forma directa B) Por el Director del Plan, previo asesoramiento con los responsables de los Grupos de Seguridad, Sanitario y autoridades locales C) Por el responsable del Grupo de Seguridad en el lugar del suceso D) Por el Alcalde del municipio afectado tras el informe verbal del SUMMA 112

23. Quien asume el mando del Grupo de Apoyo Logistico cuando la emergencia es declarada de Situacion 2
A) El responsable de Proteccion Civil del Ayuntamiento afectado B) La Delegacion del Gobierno en la Comunidad de Madrid C) El organismo que ostente las competencias de coordinacion operativa de emergencias en la Comunidad de Madrid D) El Jefe del Puesto de Mando Avanzado de forma directa

24. Segun el apartado 4.3, para asegurar una adecuada coordinacion de los trabajos en el lugar de la emergencia por parte de las Fuerzas Armadas, que medida organizativa se establece en el PMA
A) Se designara a un bombero como enlace directo con los mandos militares B) En el PMA se integrara un mando de las Fuerzas Armadas que sera el Jefe de los recursos desplegados C) El Director de Operaciones asumira el mando directo de las Fuerzas Armadas en el PMA D) Se constituira un PMA exclusivo e independiente para los recursos militares

25. Con el asesoramiento de quien determinara el Director del PLATERCAM las funciones que seran desarrolladas por las Fuerzas Armadas y su ambito territorial de actuacion
A) Del Delegado del Gobierno en la Comunidad de Madrid B) Del Oficial de Enlace de la UME o mando de las Fuerzas Armadas presente en el CECOPI C) Del Jefe del PMA en coordinacion con el Grupo de Seguridad D) Del Consejero competente en materia de medio ambiente

26. En relacion con las caracteristicas de los mensajes a la poblacion, que significa especificamente que un mensaje de aviso debe reunir la condicion de Exactitud
A) Que debe utilizar frases y palabras sencillas que todos entiendan y sin contradicciones B) Que debe emplear el menor numero de palabras posibles C) Que debe manifestar sin ambiguedad la actitud que es preciso adoptar D) Que debe ofrecer un conocimiento global y real de la situacion

27. Segun el apartado 5.3.1, que caracteristica define que un mensaje de aviso a la poblacion reune la condicion de Suficiencia
A) Que utiliza frases sencillas que todos comprenden sin contradicciones B) Que no omite nada relevante, pero sin entrar en detalles superfluos C) Que manifiesta la actitud exacta que es preciso adoptar D) Que emplea el menor numero posible de terminos tecnicos y palabras

28. En el lugar de la emergencia, que efectivos seran los que preferentemente informaran, daran avisos, señalizaran la zona afectada e aislaran el area de la emergencia
A) Los miembros del Grupo de Intervencion B) Los miembros del Grupo de Apoyo Logistico C) Los miembros del Grupo de Seguridad D) Los bomberos del ayuntamiento afectado de forma prioritaria

29. Quien definira y realizara las medidas de proteccion al medio ambiente ante una situacion de emergencia segun el plan
A) El Mando del Cuerpo de Agentes Forestales presente en el PMA B) Tecnicos especializados que apliquen las medidas mas adecuadas, requeridos por el Director del Plan e integrados en el Comite Asesor C) El Consejero competente en materia de medio ambiente D) El Jefe del Grupo de Intervencion de forma coordinada con el SEPRONA

30. Que area o zona se define como aquella donde se organiza la primera recepcion y control de los evacuados para proceder a su posterior distribucion a los lugares asignados
A) La Zona de Intervencion B) La Zona de Socorro C) La Zona Base D) El Centro de Albergue provisional directamente

HOJA DE SOLUCIONES
1  B    2  C    3  C    4  C    5  A    6  C    7  B    8  A    9  B    10  B
11  B    12  C    13  C    14  B    15  B    16  A    17  C    18  B    19  B    20  A
21  B    22  B    23  C    24  B    25  B    26  C    27  B    28  C    29  B    30  C
`

describe('parseMDTest — PLATERCAM 30 preguntas (opciones en línea siguiente)', () => {
  let result

  beforeAll(() => { result = parseMDTest(PLATERCAM_MD) })

  it('parsea las 30 preguntas', () => {
    expect(result).toHaveLength(30)
  })

  it('cada pregunta tiene 4 opciones', () => {
    for (const q of result) {
      expect(q.options).toHaveLength(4)
    }
  })

  it('cada pregunta tiene exactamente una opción correcta', () => {
    for (const q of result) {
      expect(q.options.filter(o => o.correct)).toHaveLength(1)
    }
  })

  it('respuesta correcta Q1 es B (Al Grupo de Intervencion)', () => {
    expect(result[0].options.find(o => o.correct).text).toContain('Grupo de Intervencion')
  })

  it('respuesta correcta Q5 es A (Jefe del PMA)', () => {
    expect(result[4].options.find(o => o.correct).text).toContain('Jefe del PMA')
  })

  it('respuesta correcta Q14 es B (Peligro)', () => {
    expect(result[13].options.find(o => o.correct).text).toBe('Peligro')
  })

  it('respuesta correcta Q16 es A (Catastrofe)', () => {
    expect(result[15].options.find(o => o.correct).text).toBe('Catastrofe')
  })

  it('respuesta correcta Q30 es C (La Zona Base)', () => {
    expect(result[29].options.find(o => o.correct).text).toContain('Zona Base')
  })

  it('texto de Q1 no contiene marcadores de opciones', () => {
    expect(result[0].text).not.toMatch(/[ABCD]\)/)
  })

  it('texto de Q13 incluye la referencia al apartado 1.4', () => {
    expect(result[12].text).toContain('apartado 1.4')
  })

  it('ids son únicos entre las 30 preguntas', () => {
    const ids = result.map(q => q.id)
    expect(new Set(ids).size).toBe(30)
  })
})

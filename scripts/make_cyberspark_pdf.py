"""Generate a PDF document from the India Israel CyberSpark Academy website content."""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.colors import HexColor, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, ListFlowable, ListItem,
    Table, TableStyle, KeepTogether,
)

OUT = Path(__file__).resolve().parent.parent / "India_Israel_CyberSpark_Academy.pdf"

NAVY = HexColor("#0b2545")
ORANGE = HexColor("#e08a1f")
LIGHT = HexColor("#f5f7fa")
GRAY = HexColor("#444444")

styles = getSampleStyleSheet()

H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontName="Helvetica-Bold",
                   fontSize=22, leading=26, textColor=NAVY, spaceAfter=10, spaceBefore=4)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName="Helvetica-Bold",
                   fontSize=16, leading=20, textColor=NAVY, spaceAfter=8, spaceBefore=14)
H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontName="Helvetica-Bold",
                   fontSize=12.5, leading=16, textColor=ORANGE, spaceAfter=4, spaceBefore=10)
BODY = ParagraphStyle("Body", parent=styles["BodyText"], fontName="Helvetica",
                     fontSize=10.5, leading=15, textColor=GRAY, alignment=TA_JUSTIFY,
                     spaceAfter=6)
QUOTE = ParagraphStyle("Quote", parent=BODY, leftIndent=10, borderColor=ORANGE,
                      borderWidth=0, textColor=GRAY, fontSize=10.5, leading=15)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=9, textColor=GRAY)
COVER_TITLE = ParagraphStyle("CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
                            fontSize=30, leading=36, textColor=NAVY, alignment=TA_LEFT)
COVER_SUB = ParagraphStyle("CoverSub", parent=BODY, fontSize=14, leading=20,
                          textColor=ORANGE, fontName="Helvetica-Bold")

def header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    # top bar
    canvas.setFillColor(NAVY)
    canvas.rect(0, h - 1.2*cm, w, 1.2*cm, stroke=0, fill=1)
    canvas.setFillColor(ORANGE)
    canvas.rect(0, h - 1.25*cm, w, 0.05*cm, stroke=0, fill=1)
    canvas.setFillColor(HexColor("#ffffff"))
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(2*cm, h - 0.78*cm, "India Israel CyberSpark Academy")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(w - 2*cm, h - 0.78*cm, "Making You Job Ready")
    # footer
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, w, 0.9*cm, stroke=0, fill=1)
    canvas.setFillColor(HexColor("#ffffff"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2*cm, 0.32*cm,
        "© All rights reserved to India Israel CyberSpark Academy  •  cybersparkacademy.in")
    canvas.drawRightString(w - 2*cm, 0.32*cm, f"Page {doc.page}")
    canvas.restoreState()


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(t, BODY), leftIndent=10, value="bullet") for t in items],
        bulletType="bullet", leftIndent=14, bulletColor=ORANGE,
    )

def stat_box(num, label):
    t = Table([[Paragraph(f"<font color='#e08a1f' size='20'><b>{num}</b></font>", BODY)],
               [Paragraph(f"<b>{label}</b>", SMALL)]],
              colWidths=[5.2*cm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, NAVY),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t

def stats_row():
    row = Table(
        [[stat_box("2,000+", "Happy Students Enrolled"),
          stat_box("1,500+", "Students Placed Globally"),
          stat_box("400+", "Students Self-Employed")]],
        colWidths=[5.4*cm]*3,
    )
    row.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE")]))
    return row

def course_card(title, desc):
    code = ""
    if "[" in title and "]" in title:
        code = title[title.rfind("["):title.rfind("]")+1]
    inner = [Paragraph(f"<b>{title}</b>", H3), Paragraph(desc, BODY)]
    if code:
        inner.append(Paragraph(f"<font color='#e08a1f'><b>Course code:</b> {code}</font>", SMALL))
    t = Table([[inner]], colWidths=[16.5*cm])
    t.setStyle(TableStyle([
        ("BOX", (0,0), (-1,-1), 0.4, HexColor("#dddddd")),
        ("LINEBEFORE", (0,0), (0,-1), 3, ORANGE),
        ("BACKGROUND", (0,0), (-1,-1), HexColor("#fbfbfb")),
        ("LEFTPADDING", (0,0), (-1,-1), 12),
        ("RIGHTPADDING", (0,0), (-1,-1), 12),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))
    return KeepTogether([t, Spacer(1, 6)])


story = []

# ---------- COVER ----------
story.append(Spacer(1, 3*cm))
story.append(Paragraph("India Israel<br/>CyberSpark Academy", COVER_TITLE))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("Making You Job Ready", COVER_SUB))
story.append(Spacer(1, 1.2*cm))
story.append(Paragraph(
    "Get trained by Israeli Experts — world leaders in technology development "
    "and training. Specialization tracks in Cyber Security, Cloud Computing, "
    "Data Networking and 5G Cellular Networks.", BODY))
story.append(Spacer(1, 1.2*cm))
story.append(stats_row())
story.append(Spacer(1, 2*cm))
story.append(Paragraph("Save Your Future  •  Save Your Time  •  Save Your Money",
                      ParagraphStyle("tag", parent=BODY, fontSize=12, textColor=ORANGE,
                                    fontName="Helvetica-Bold", alignment=1)))
story.append(Spacer(1, 1*cm))
story.append(Paragraph("Bengaluru, India  |  Jerusalem, Israel",
                      ParagraphStyle("addr", parent=SMALL, alignment=1, textColor=NAVY)))
story.append(PageBreak())

# ---------- HOME ----------
story.append(Paragraph("Home — Be Job Ready", H1))
story.append(Paragraph(
    "Get trained by Israeli Experts — world leaders in tech development and training. "
    "Life is too short to be in a bad job: you are destined for more. A bad job is not fun. "
    "Don't be held back. Schedule a call with our experts and take the first step toward a "
    "career that matches your potential.", BODY))

story.append(Paragraph("Our Promise", H2))
story.append(bullets([
    "<b>Save Your Future</b> — get on a high-demand career track.",
    "<b>Save Your Time</b> — focused, practical, hands-on programs.",
    "<b>Save Your Money</b> — train with experts and avoid costly job rejections.",
]))

story.append(Paragraph("Premium Courses Customised for Businesses (2024 high-demand opportunities)", H2))
story.append(course_card("Introduction to 5G Cellular Networks",
    "As 5G cellular networks take their place as the new cellular technology, this course "
    "introduces the 5G network architecture, new radio, operation and security."))
story.append(course_card("Data Networks Security",
    "Securing the information systems environment is one of the important tasks of the "
    "organization's IT. This course focuses on the design, analysis and implementation of "
    "enterprise-level security information systems."))
story.append(course_card("Internet of Things (IoT) Networking",
    "IoT technologies bring tens of billions of new devices to the network with requirements "
    "that are not common to standard communications — this course covers those new demands."))

story.append(Paragraph("We Don't Just Care About Your Job; We Care About You", H2))
story.append(stats_row())
story.append(Spacer(1, 0.4*cm))

story.append(Paragraph("3 Steps to Enroll", H2))
story.append(bullets([
    "<b>Step 1:</b> Schedule a call with our experts.",
    "<b>Step 2:</b> Choose a course that matches your goals.",
    "<b>Step 3:</b> Be Job Ready — avoid job rejections, avail job offers.",
]))

story.append(Paragraph("Why IICA?", H2))
story.append(Paragraph(
    "Tech training programs in India often fail to meet industry needs and therefore do not "
    "make students job ready. IICA offers tech training programs through Israeli experts who "
    "are world leaders in tech development and training, helping you develop the professional "
    "skills demanded by the global tech industry.", BODY))
story.append(PageBreak())

# ---------- LEARNING PATHS ----------
story.append(Paragraph("Learning Paths", H1))
story.append(Paragraph(
    "<i>Specialization tracks in cloud computing, data communication and information security.</i>", QUOTE))
story.append(Paragraph(
    "In this section the student can take various specialization courses in computing and "
    "information security, including unique courses on: information security and protecting "
    "the organization's systems, cellular networks (with emphasis on 5G), cloud computing and "
    "protection of cloud applications, network analysis and forensics, and other subjects on "
    "the cutting edge of IT and Cyber Security.", BODY))

story.append(Paragraph("Categories", H2))
story.append(bullets([
    "Bridge programs 2026",
    "Cellular and 5G Networks Engineer",
    "Cyber Security Architect",
]))

story.append(Paragraph("Cyber Security Architect Track", H2))
story.append(course_card("Network and Cyber Security Protocols [SEC-001]",
    "Mastering the foundations: a comprehensive exploration of enterprise-level security "
    "in the Cyber Security Architect track."))
story.append(course_card("Network and Cyber Security Protocols [SEC-002]",
    "Elevating expertise: advanced insights into network and internet applications security."))
story.append(course_card("Operating Systems Security [SEC-003]",
    "Fortifying systems: Windows and Linux security essentials in the Cyber Security Architect series."))
story.append(course_card("Cloud Security [SEC-004]",
    "Securing the cloud: advanced cloud architecture and security in the final series of "
    "the Cyber Security Architect track."))

story.append(Paragraph("Cellular and 5G Networks Engineer Track", H2))
story.append(course_card("Introduction to Radio Technologies and Cellular Networks [CELL-001]",
    "Introduces the 5G network architecture, new radio principles, operation and security as 5G "
    "becomes the new cellular technology."))
story.append(course_card("4G/5G Cellular Networks Architecture and Operation [CELL-002]",
    "In-depth practical knowledge of Wireshark protocol analyser and how to use it for cellular "
    "network architecture and operation analysis."))
story.append(course_card("4G/5G Cellular Networks Data Flows and Security [CELL-003]",
    "Practical knowledge of Wireshark protocol analyser focused on cellular data flows and security."))

story.append(Paragraph("Bridge Programs 2026", H2))
story.append(course_card("Bridge program 2026 #1",
    "An entry-level bridge program designed for the 2026 cohort to help students transition "
    "into specialization tracks in Cyber Security and 5G Networks."))
story.append(PageBreak())

# ---------- CONSULTING ----------
story.append(Paragraph("Consulting — Network Analysis", H1))
story.append(Paragraph(
    "<i>Gain insights into your network traffic and troubleshoot network issues effectively.</i>", QUOTE))
story.append(Paragraph(
    "CyberSpark excels in consulting and engineering tailored for intricate communication "
    "systems. Our dedicated team of network specialists covers a wide spectrum, including "
    "communication networks and fortified network security, analysis, forensics, strategy and "
    "training across diverse domains such as land-line campus networks, wireless infrastructure, "
    "and cellular networks.", BODY))

story.append(Paragraph("Service Objectives", H3))
story.append(bullets([
    "Gather and analyse data flowing through the network.",
    "Use advanced network analysis tools to provide insights into traffic, bandwidth "
    "consumption, load distribution and network issues.",
    "Continuous, on-demand analysis.",
]))

story.append(Paragraph("Deliverables", H3))
story.append(bullets([
    "Comprehensive reports providing insights into network conditions.",
    "Guaranteed improvement in network performance.",
]))

story.append(Paragraph("Customer Advantages", H3))
story.append(bullets([
    "Enhanced network performance.",
    "Optimised network utilisation.",
]))

story.append(Paragraph("Case Study — High-Resolution Highway Camera Network", H2))
story.append(Paragraph(
    "Several years ago, a sophisticated security-camera network monitoring a highway suffered "
    "intermittent video freezes detected by control-room operators. Network-switch testing "
    "showed no errors or overloads — each camera had 1G of bandwidth and 10G fibre between "
    "switches. A Wireshark test using TCP Stream Graphs uncovered brief 'run-away' periods in "
    "Video I/P frames lasting around 50 ms, causing the visible distortions.", BODY))
story.append(Paragraph(
    "Network testing is usually triggered by user complaints — sluggishness, delays, voice "
    "or video distortion. Faults don't always originate within the network; a comprehensive "
    "examination is essential to pinpoint the true source. SNMP tools (Solarwinds NPM, PRTG), "
    "Netflow/IPFix tools and IP-mapping software are useful, but identifying issues that evade "
    "standard monitoring requires a protocol analyser such as <b>Wireshark</b>.", BODY))
story.append(Paragraph(
    "With over thirty years of field experience and several internationally distributed books "
    "on the subject, our team handles slow-performance, disconnection, suspected intrusion and "
    "security cases. In the case above the root cause was a software issue delaying video frames "
    "to the control-room monitors — clearly visible in the Wireshark graph.", BODY))
story.append(PageBreak())

# ---------- CORPORATE OFFERINGS ----------
story.append(Paragraph("Corporate Offerings", H1))
story.append(Paragraph(
    "<i>Empowering Excellence: Bridging Theory and Practice in Data Network Design and Security.</i>", QUOTE))
story.append(Paragraph(
    "Over the past three decades and beyond, we have accumulated expertise in designing and "
    "implementing data networks while ensuring their security. Transferring this experience to "
    "our clients has evolved into one of our core competencies, evident in our courses which "
    "combine advanced theoretical insight into protocols with practical applications grounded "
    "in extensive field experience.", BODY))
story.append(Spacer(1, 0.3*cm))
story.append(stats_row())
story.append(Spacer(1, 0.4*cm))

story.append(Paragraph("Featured Corporate Courses", H2))
for title, desc in [
    ("Network Troubleshooting Using Wireshark for Cellular Networks",
     "Practical knowledge of Wireshark protocol analyser for IP-based networks with emphasis on cellular networks."),
    ("Network Troubleshooting Using Wireshark — The Complete Course",
     "In-depth practical knowledge of Wireshark and additional tools for full network analysis."),
    ("Network Troubleshooting Using Wireshark",
     "Practical knowledge of Wireshark for network analysis, covering core protocols and analysis methodology."),
    ("MPLS — Architecture and Protocols",
     "Multi-Protocol Label Switching has become the core of cellular and landline networks. The course "
     "describes the technology, its protocols and adaptations for large-scale private networks."),
    ("Introduction to MPLS",
     "Foundational MPLS concepts, technology and protocols for engineers entering provider networks."),
    ("Introduction to 5G Cellular Networks",
     "Introduces the 5G network architecture, new radio, operation and security."),
    ("Internet of Things (IoT) Networking",
     "Covers the new requirements introduced by tens of billions of IoT devices that are not common to standard communications."),
    ("Information Systems Security",
     "Design, analysis and implementation of enterprise-level information-security systems."),
    ("Introduction to Data Networking and TCP/IP",
     "Basic theory of network hardware and software starting with the OSI reference model and data structures."),
    ("Authentication and Encryption",
     "Cryptography essentials: transforming plaintext using ciphers so it is unreadable to anyone "
     "without the special knowledge required to decrypt it."),
    ("Data Networks Security",
     "Design, analysis and implementation of enterprise-level secure information systems."),
    ("IPv6 — Basics, Protocols and Implementation",
     "IPv6 is integral to IoT applications and mobile networks. The course covers basics, protocols and implementation."),
]:
    story.append(course_card(title, desc))
story.append(PageBreak())

# ---------- KNOWLEDGE BASE ----------
story.append(Paragraph("Resources — Knowledge Base", H1))
story.append(Paragraph(
    "Curated articles and guides on cyber-security fundamentals, careers and industry trends.", BODY))

story.append(Paragraph("Categories", H2))
story.append(bullets(["Articles", "Cyber Security Basics", "Career & Industry"]))

story.append(Paragraph("Featured Articles", H2))
story.append(course_card("Two-Factor vs. Multi-Factor Authentication: Protect Your Identity in 2025",
    "In today's rapidly evolving digital world, securing your identity online is no longer a "
    "choice — it's a necessity. Whether you access banking apps, work systems or academic "
    "portals, this article explains the difference between 2FA and MFA and how to choose the "
    "right protection."))
story.append(course_card("Breaking Into Cybersecurity: Opportunities, Trends & Career Paths in India and Beyond",
    "Cybersecurity, network forensics, secure development and Zero Trust are more than buzzwords — "
    "they represent a fast-growing and essential field. This guide covers opportunities, trends "
    "and career paths for aspirants in India and globally."))
story.append(course_card("Avail Top Job Offers",
    "Interact with industry leaders to choose the best career path for you."))
story.append(course_card("Save Time & Money",
    "Practical guidance on how to create immediate value for your next employer."))
story.append(course_card("Avoid Job Rejections",
    "Become a Certified Cyber Security Specialist to create better value for yourself and stand "
    "out in the hiring process."))

story.append(Paragraph("Free Download", H2))
story.append(Paragraph(
    "<b>Cybersecurity Career Guide</b> — A Comprehensive Playbook to becoming a Cybersecurity "
    "Expert. Download the free PDF and elevate your career in the tech industry.", BODY))
story.append(PageBreak())

# ---------- ABOUT ----------
story.append(Paragraph("About Us", H1))
story.append(Paragraph("Bringing Israel's Technology Prowess to India", H2))
story.append(Paragraph(
    "Israel houses one of the world's highest-performing innovation ecosystems and is a leading "
    "source of technologies that change the world. More than one third of all American start-ups "
    "with billion-dollar valuations have an Israeli founder, and Israel's unemployment rate is "
    "among the world's lowest.", BODY))
story.append(Paragraph(
    "Israel's renowned academic system fosters an extraordinarily talented workforce, with the "
    "highest concentration of engineers and PhDs per capita in the world and a #4 global ranking "
    "for research personnel. Israel's significant base in IoT, cloud computing, robotics and AI "
    "can help accelerate Indian manufacturers' shift toward smart manufacturing.", BODY))
story.append(Paragraph(
    "India is an exciting marketplace for innovative Israeli companies. Cybersecurity is a "
    "growing and natural area of close cooperation between the two nations — emphasised by both "
    "Prime Ministers and underscored by the COVID-19 pandemic. Academic collaborations span "
    "Agriculture, Innovation, Quantum Research, Deep Tech, Cybersecurity, Media & Internet, "
    "FinTech, Automotive and High-Tech & Smart Manufacturing.", BODY))
story.append(Paragraph(
    "<b>CyberSpark Academy combines Israeli prowess in disruptive technologies with Indian "
    "technological requirements</b>, particularly in Cybersecurity, Cloud, Data Networking and IT.", BODY))

story.append(Paragraph("Our Vision", H2))
story.append(bullets([
    "<b>World-class learning material</b> — online content distilled from the latest research and best practice.",
    "<b>Mentored by industry experts</b> — learn the tricks of the trade from seasoned practitioners.",
    "<b>Learn from pioneers</b> — internationally renowned faculty from research and industry.",
    "<b>Practical immersion</b> — hands-on projects, real-world problems and a professional portfolio.",
]))

story.append(Paragraph("Our Team", H2))
team = [
    ("Ms Surbhi Sharma", "Honorary Consul of Spain  •  Director, Euro-India Research Consulting, India"),
    ("Mr Yoram Orzach", "Director, NDI Communications, Israel"),
    ("Mr Karthik Kumar S", "Director, CyberSpark Academy, India"),
]
team_rows = [[Paragraph(f"<b>{n}</b>", BODY), Paragraph(r, SMALL)] for n, r in team]
tt = Table(team_rows, colWidths=[5*cm, 11.5*cm])
tt.setStyle(TableStyle([
    ("BOX", (0,0), (-1,-1), 0.4, HexColor("#dddddd")),
    ("INNERGRID", (0,0), (-1,-1), 0.3, HexColor("#eeeeee")),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 8),
    ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ("LEFTPADDING", (0,0), (-1,-1), 10),
    ("BACKGROUND", (0,0), (-1,-1), LIGHT),
]))
story.append(tt)
story.append(PageBreak())

# ---------- CONTACT ----------
story.append(Paragraph("Contact Us", H1))
story.append(Paragraph("For any question, please reach out:", BODY))

contact_data = [
    [Paragraph("<b>Address (India)</b>", BODY), Paragraph("No. 4, Haudin Road, Bengaluru, Karnataka, India", BODY)],
    [Paragraph("<b>Address (Israel)</b>", BODY), Paragraph("Hamechanechet 39, Jerusalem, Israel", BODY)],
    [Paragraph("<b>Email</b>", BODY), Paragraph("info@cybersparkacademy.in", BODY)],
    [Paragraph("<b>Mobile (India)</b>", BODY), Paragraph("+91 9845-472347", BODY)],
    [Paragraph("<b>Phone (Israel)</b>", BODY), Paragraph("+972 52-489-9699", BODY)],
    [Paragraph("<b>Website</b>", BODY), Paragraph("cybersparkacademy.in", BODY)],
]
ct = Table(contact_data, colWidths=[4.5*cm, 12*cm])
ct.setStyle(TableStyle([
    ("BOX", (0,0), (-1,-1), 0.5, NAVY),
    ("INNERGRID", (0,0), (-1,-1), 0.3, HexColor("#dddddd")),
    ("BACKGROUND", (0,0), (0,-1), LIGHT),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 8),
    ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ("LEFTPADDING", (0,0), (-1,-1), 10),
]))
story.append(ct)

story.append(Spacer(1, 0.6*cm))
story.append(Paragraph("Quick Links", H2))
story.append(bullets([
    "Home", "Learning Paths", "Consulting", "Corporate Offerings",
    "Resources / Knowledge Base", "About Us", "Testimonials", "Contact Us",
]))

story.append(Spacer(1, 0.6*cm))
story.append(Paragraph(
    "<i>© All rights reserved to India Israel CyberSpark Academy.</i>", SMALL))

# ---------- BUILD ----------
doc = SimpleDocTemplate(
    str(OUT), pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2*cm, bottomMargin=1.6*cm,
    title="India Israel CyberSpark Academy",
    author="India Israel CyberSpark Academy",
)
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f"Wrote {OUT}")

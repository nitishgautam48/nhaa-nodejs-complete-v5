// ================================================================
//  LEGAL GUIDANCE - Redressal Channels & Legal Provisions
//
//  ⚠️ IMPORTANT SCOPE NOTE: this module gives general legal information,
//  not legal advice, and is not a substitute for a lawyer or a District
//  Legal Services Authority (DLSA). Two things it deliberately does NOT do:
//
//  1. It does not cite specific IPC/BNS section numbers for general
//     (non-Atrocities-Act) offenses. India replaced the IPC/CrPC/Evidence
//     Act with the Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik
//     Suraksha Sanhita (BNSS), and Bharatiya Sakshya Adhiniyam (BSA) on
//     1 July 2024 - which code applies depends on the date the offence was
//     committed, not the date of filing. Citing a fixed section number here
//     risks being wrong for a given case and ending up in an actual
//     complaint. The SC/ST (Prevention of Atrocities) Act, 1989 itself is a
//     standalone special law and is NOT renumbered by the BNS transition,
//     so its provisions are named directly below.
//  2. It gives rights/protections and where-to-go information, not a
//     prediction of case outcome.
//
//  Always route the user to verify specifics with NALSA (15100), a District
//  Legal Services Authority, or a lawyer before filing anything.
// ================================================================

class LegalGuidance {
    constructor() {
        this.disclaimer =
            'This is general legal information, not legal advice, and not a ' +
            'substitute for a lawyer. Exact section numbers can depend on the ' +
            'date of the incident (India moved from the IPC/CrPC/Evidence Act ' +
            'to the BNS/BNSS/BSA on 1 July 2024). Verify specifics with NALSA ' +
            '(15100), your District Legal Services Authority, or a lawyer ' +
            'before filing anything.';

        // Redressal channels reusable across multiple incident types.
        this.redressalChannels = {
            police_fir: {
                name: 'File an FIR at any police station',
                detail:
                    'Under the SC/ST (Prevention of Atrocities) Act, a police officer ' +
                    'cannot require a preliminary inquiry before registering an FIR, ' +
                    'and cannot demand approval from a senior officer before doing so ' +
                    '(Section 18A, added 2018). If police refuse to register an FIR, ' +
                    'that refusal can itself be escalated to the Superintendent of ' +
                    'Police, the State/National SC/ST Commission, or a Magistrate.'
            },
            special_court: {
                name: 'Special Court / Exclusive Special Court',
                detail:
                    'Every district is required to have a Special Court (a Sessions ' +
                    'Court) to try offences under the Atrocities Act, with Exclusive ' +
                    'Special Courts in high-caseload districts (Sections 14, 14A). ' +
                    'These courts are meant to complete trial quickly rather than ' +
                    'through the regular court backlog.'
            },
            ncsc: {
                name: 'National Commission for Scheduled Castes (NCSC)',
                detail:
                    'Investigates complaints of caste-based atrocities and rights ' +
                    'violations against SCs; can also flag non-response by police/' +
                    'administration. Complaints can be filed online or in writing.',
                website: 'www.ncsc.nic.in'
            },
            ncst: {
                name: 'National Commission for Scheduled Tribes (NCST)',
                detail: 'Equivalent commission for complaints involving Scheduled Tribes.',
                website: 'www.ncst.nic.in'
            },
            nalsa_legal_aid: {
                name: 'NALSA free legal aid - 15100 (toll-free)',
                detail:
                    'Members of Scheduled Castes and Scheduled Tribes are entitled to ' +
                    'completely free legal aid regardless of income (Section 12(a), ' +
                    'Legal Services Authorities Act, 1987) - a lawyer, drafting help, ' +
                    'and court representation at no cost. Call 15100 or apply through ' +
                    'the nearest District Legal Services Authority (DLSA).'
            },
            victim_compensation: {
                name: 'Victim compensation under the SC/ST POA Rules',
                detail:
                    'Monetary relief is payable in stages - on FIR registration, on ' +
                    'chargesheet filing, and after conviction - with amounts set by a ' +
                    'schedule in the Atrocities Act Rules, and is separate from (in ' +
                    'addition to) any compensation available under other law. Ask the ' +
                    'investigating officer or DLSA about the relief schedule for your ' +
                    'case type.'
            },
            nhrc: {
                name: 'National/State Human Rights Commission',
                detail:
                    'Can be approached for custodial violence, police brutality, or ' +
                    'other human-rights violations, including against state officials.'
            },
            cybercrime_portal: {
                name: 'National Cyber Crime Reporting Portal / 1930',
                detail: 'For online caste-based harassment, threats, or abuse.',
                website: 'cybercrime.gov.in'
            },
            child_helpline: {
                name: 'Childline - 1098',
                detail: 'For any case involving a minor victim; also triggers POCSO Act procedure.'
            },
            women_helpline: {
                name: 'Women\'s helpline - 181',
                detail: 'For cases involving violence against women.'
            }
        };

        // Guidance per SC/ST atrocity pattern - keyed to match the pattern
        // names in scstTrainer.js's abusePatterns exactly, so results merge
        // directly against SCSTTrainer.analyze() output.
        // ✅ BUG FIX: scstTrainer.js's pattern names and this object's keys
        // had drifted apart (e.g. trainer emits 'gang_rape', this had
        // 'sexual_violence'; trainer emits 'police_brutality', this had
        // 'police_or_custodial_violence'). getGuidanceForSCST() looked up
        // provisions by exact key match, so for gang_rape, sexual_abuse_
        // indirect, police_brutality, intellectual_theft, and
        // coercive_silencing - some of the MOST severe pattern types - no
        // legal guidance was ever returned, silently. This alias table
        // maps trainer pattern names to the provision entry that applies.
        this.patternKeyAliases = {
            gang_rape: 'sexual_violence',
            sexual_abuse_indirect: 'sexual_violence',
            police_brutality: 'police_or_custodial_violence',
            intellectual_theft: 'intellectual_property_theft'
        };

        // ============================================================
        //  LANDMARK CASE LAW (general awareness, not citation-ready)
        //  These are genuinely real, well-known Indian judgments relevant
        //  to caste-based and gender-based violence. Deliberately kept to
        //  case name + year + plain-language holding only - NOT exact
        //  citation numbers (AIR/SCC/etc), since getting a citation wrong
        //  is worse than not giving one, and a victim or advocate should
        //  verify the precise citation with counsel before relying on it
        //  in any filing.
        // ============================================================
        this.landmarkCaseLaw = [
            // ✅ BUG FIX: this entry's old relevance tag ('workplace_discrimination,
            // sexual_violence') matched NEITHER a real scstTrainer.js pattern
            // name (gang_rape, sexual_abuse_indirect, discrimination, etc.)
            // NOR the 'general SC/ST Act procedure' catch-all - so despite
            // being one of the most well-known Indian judgments in this
            // entire list, it could never actually be surfaced by either
            // getGuidanceForSCST() or getGuidanceForClinical() (which didn't
            // surface case law at all until this fix). Retagged to the real
            // pattern names it's actually relevant to, plus the new
            // 'workplace_sexual_harassment' clinical guidance key below.
            {
                caseName: 'Vishaka v. State of Rajasthan (1997)',
                relevance: 'workplace_sexual_harassment, gang_rape, sexual_abuse_indirect',
                holding: 'Supreme Court laid down guidelines against workplace sexual harassment in the absence of specific legislation - these guidelines directly led to the POSH Act, 2013.'
            },
            {
                caseName: 'Apparel Export Promotion Council v. A.K. Chopra (1999)',
                relevance: 'workplace_sexual_harassment',
                holding: 'Supreme Court held that sexual harassment does not require physical contact - unwelcome conduct that fails the test of decency and modesty is enough - and upheld the dismissal of an employee for workplace sexual harassment, holding that leniency in such cases sends a demoralizing message to women employees. Reaffirmed that workplace sexual harassment violates fundamental rights under Articles 14, 19, and 21 of the Constitution.'
            },
            {
                caseName: 'Medha Kotwal Lele v. Union of India (2012)',
                relevance: 'workplace_sexual_harassment',
                holding: 'Fifteen years after the Vishaka guidelines, the Supreme Court found their implementation still grossly inadequate in many states and institutions, and directed every state to ensure Complaints Committees are actually constituted and functioning at the taluka, district, and state levels, with a strict two-month compliance deadline - directly reinforcing what became the POSH Act, 2013\'s Internal/Local Committee structure.'
            },
            {
                caseName: 'State of Karnataka v. Appa Balu Ingale (1995)',
                relevance: 'discrimination, denial_of_access_and_social_boycott',
                holding: 'Supreme Court upheld convictions for practicing untouchability (denying access to a public well), affirming that untouchability in any form is a constitutional and criminal violation, not a private/social matter beyond law\'s reach.'
              },
            {
                caseName: 'Subhash Kashinath Mahajan v. State of Maharashtra (2018) and the SC/ST (Amendment) Act, 2018',
                relevance: 'general SC/ST Act procedure',
                holding: 'The Supreme Court initially added procedural safeguards (preliminary inquiry before FIR, approval before arrest) that victim groups argued weakened the Act. Parliament responded with the 2018 Amendment (adding Section 18A) to restore the original protections - Section 18A now explicitly overrides any requirement for preliminary inquiry or prior approval. This history is why Section 18A is stated firmly in this tool\'s guidance.'
            },
            {
                caseName: 'Prithvi Raj Chauhan v. Union of India (2020)',
                relevance: 'general SC/ST Act procedure',
                holding: 'Supreme Court upheld the validity of the 2018 Amendment Act (including Section 18A), confirming the restored protections remain good law.'
            },
            {
                caseName: 'Nipun Saxena v. Union of India (2018)',
                relevance: 'sexual_violence, child_abuse',
                holding: 'Supreme Court laid down directions protecting the identity of sexual assault victims, including minors, restricting disclosure of their identity in media and even in judicial orders.'
            },
            {
                caseName: 'Lata Singh v. State of U.P. (2006)',
                relevance: 'honor_based_violence',
                holding: 'Supreme Court held that inter-caste and inter-religious marriages between consenting adults are lawful, and directed police/authorities to protect couples and their families from harassment or violence over such marriages.'
            },
            {
                caseName: 'Shakti Vahini v. Union of India (2018)',
                relevance: 'honor_based_violence',
                holding: 'Supreme Court issued detailed preventive and remedial directions against honor-based violence by khap panchayats or families, including a dedicated police protection protocol for threatened couples.'
            },
            {
                caseName: 'State of M.P. v. Ram Krishna Balothia (1995)',
                relevance: 'general SC/ST Act procedure',
                holding: 'Supreme Court upheld the constitutional validity of Section 18 of the Atrocities Act (the bar on anticipatory bail for scheduled offences), holding that offences arising from caste-based "untouchability" and atrocity form a distinct class where anticipatory bail is regularly misused to threaten and intimidate victims and witnesses - the special, more restrictive procedural treatment was held reasonable, not discriminatory.'
            },
            {
                caseName: 'Kailas & Others v. State of Maharashtra (2011)',
                relevance: 'public_humiliation, general SC/ST Act procedure',
                holding: 'In a case where a tribal woman was assaulted, stripped, and paraded, the Supreme Court made strong observations on the continued exploitation of Dalits/Adivasis and enhanced her compensation - but the conviction specifically under the Atrocities Act itself was set aside because the investigation had not been conducted by an officer of at least Deputy Superintendent of Police rank as the Act requires, and the victim\'s caste had not been formally proved. A caution that correct procedure at the investigation stage (right-rank investigating officer, caste proof on record) is essential for an Atrocities Act charge to hold, separate from the underlying IPC/BNS offence.'
            },
            {
                caseName: 'Samatha v. State of Andhra Pradesh (1997)',
                relevance: 'land_and_livelihood_dispossession',
                holding: 'Supreme Court held that government, tribal, and forest land in Fifth Schedule "Scheduled Areas" cannot be leased to non-tribal persons or private companies for mining - such activity may only be carried out by a state mineral development corporation or a cooperative of tribal persons themselves - to protect tribal land, livelihood, and self-governance rights guaranteed by the Fifth Schedule.'
            },
            {
                caseName: 'Arumugam Servai v. State of Tamil Nadu (2011)',
                relevance: 'honor_based_violence, denial_of_access_and_social_boycott, discrimination',
                holding: 'Supreme Court condemned khap/katta panchayats that decree or encourage honor killings, or impose social boycotts, over inter-caste or inter-religious marriage as "wholly illegal" and directed that they be "ruthlessly stamped out." Administrative and police officers were held directly, departmentally accountable if they fail to act against such practices in their jurisdiction despite having knowledge of them.'
            }
        ];

        this.scstProvisions = {
            sexual_violence: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (as amended) + general sexual-offence law (BNS if the incident is on/after 1 July 2024, IPC if before)',
                keyProtections: [
                    'No preliminary inquiry needed before FIR registration (Section 18A)',
                    'No anticipatory bail for the accused in most circumstances (Section 18)',
                    'Enhanced/mandatory minimum sentencing where the victim is an SC/ST woman',
                    'Trial before a Special Court, with in-camera proceedings available for the victim\'s protection',
                    'Right to a woman police officer for recording the statement, and to have a support person present'
                ],
                authorities: ['police_fir', 'special_court', 'ncsc', 'nalsa_legal_aid', 'victim_compensation', 'women_helpline']
            },
            child_abuse: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (as amended) + POCSO Act, 2012',
                keyProtections: [
                    'POCSO requires child-friendly procedures: recording of statement by a woman officer, no overnight stay at a police station, and a support person throughout',
                    'Mandatory reporting - anyone aware of the abuse is legally required to report it',
                    'Special Court trial under both POCSO and the Atrocities Act where applicable',
                    'In-camera proceedings and identity protection for the child'
                ],
                authorities: ['police_fir', 'child_helpline', 'special_court', 'nalsa_legal_aid', 'victim_compensation']
            },
            caste_based_killing: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (as amended) + general homicide law (BNS/IPC depending on date)',
                keyProtections: [
                    'No preliminary inquiry before FIR (Section 18A)',
                    'No anticipatory bail for accused (Section 18)',
                    'Mandatory compensation to next of kin at multiple stages, not only after conviction',
                    'Trial before a Special/Exclusive Special Court'
                ],
                authorities: ['police_fir', 'special_court', 'ncsc', 'ncst', 'nalsa_legal_aid', 'victim_compensation', 'nhrc']
            },
            police_or_custodial_violence: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (as amended) + National/State Human Rights Commission jurisdiction',
                keyProtections: [
                    'Custodial violence can be reported directly to the NHRC/State Human Rights Commission, bypassing the same police department',
                    'A magistrate can be approached directly under criminal procedure for custodial abuse',
                    'Independent medical examination can be requested/ordered'
                ],
                authorities: ['nhrc', 'ncsc', 'nalsa_legal_aid', 'special_court', 'victim_compensation']
            },
            land_and_livelihood_dispossession: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (as amended) + state land-rights and bonded-labour law',
                keyProtections: [
                    'Illegal dispossession of SC/ST land or coerced/bonded labour is itself a scheduled offence under the Act',
                    'The Bonded Labour System (Abolition) Act, 1976 separately voids bonded-labour agreements and entitles the person to immediate release and rehabilitation',
                    'District administration and NCSC/NCST can be approached for land-record disputes alongside a criminal complaint'
                ],
                authorities: ['police_fir', 'ncsc', 'ncst', 'nalsa_legal_aid']
            },
            denial_of_access_and_social_boycott: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (as amended) + Protection of Civil Rights Act, 1955',
                keyProtections: [
                    'Denial of access to a public well, temple, road, or other public resource, and organized social boycott, are both scheduled offences under the Atrocities Act',
                    'Untouchability in any form is separately prohibited under Article 17 of the Constitution and the Protection of Civil Rights Act, 1955'
                ],
                authorities: ['police_fir', 'ncsc', 'ncst', 'nalsa_legal_aid']
            },
            discrimination: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (as amended) + Protection of Civil Rights Act, 1955',
                keyProtections: [
                    'Caste-based discrimination in access to services, employment practices, or public spaces can be a scheduled offence',
                    'NCSC/NCST can independently investigate even without a police complaint being filed first'
                ],
                authorities: ['ncsc', 'ncst', 'nalsa_legal_aid', 'police_fir']
            },
            public_humiliation: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (as amended)',
                keyProtections: [
                    'Parading, stripping, tonsuring, garlanding with footwear, and similar acts intended to humiliate an SC/ST person are explicitly scheduled offences',
                    'No preliminary inquiry required before FIR (Section 18A)'
                ],
                authorities: ['police_fir', 'ncsc', 'ncst', 'nalsa_legal_aid', 'victim_compensation']
            },
            election_and_political_intimidation: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (as amended) + Representation of the People Act, 1951',
                keyProtections: [
                    'Preventing an SC/ST person from voting, contesting, or holding a panchayat/local-body seat they are entitled to is a scheduled offence',
                    'Election Commission and the State Election Commission (for panchayat/municipal seats) can also be approached directly'
                ],
                authorities: ['police_fir', 'ncsc', 'ncst', 'nalsa_legal_aid']
            },
            false_conviction: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (as amended) + right to appeal/revision under criminal procedure',
                keyProtections: [
                    'A wrongful conviction can be challenged on appeal, and in appropriate cases through a curative/review process',
                    'Legal aid for filing an appeal is available free of cost through NALSA regardless of income for SC/ST individuals',
                    'Malicious or false prosecution motivated by caste bias can itself be reported to NCSC/NCST'
                ],
                authorities: ['nalsa_legal_aid', 'ncsc', 'ncst']
            },
            intellectual_property_theft: {
                primaryLaw: 'Copyright Act, 1957 / Patents Act, 1970 (as applicable) - general IP law, not the Atrocities Act',
                keyProtections: [
                    'If caste bias motivated the denial of credit or theft of work, this can be raised with NCSC/NCST alongside a normal IP claim',
                    'NALSA legal aid covers drafting a legal notice or filing an IP claim for an SC/ST individual regardless of income'
                ],
                authorities: ['nalsa_legal_aid', 'ncsc', 'ncst']
            },
            // ✅ NEW: previously had no entry at all, so a victim reporting
            // being threatened into silence got no legal guidance, even
            // though this is one of the most dangerous, most actionable
            // signals a case can contain.
            coercive_silencing: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989, Section 3(2) + Witness Protection Scheme, 2018',
                keyProtections: [
                    'Threatening, intimidating, or coercing an SC/ST victim or witness into silence or withdrawing a complaint is itself a separate scheduled offence under the Act',
                    'Eligible for protective measures under the Witness Protection Scheme, 2018 - including identity protection, relocation, and police escort during trial',
                    'A fresh, separate FIR can be filed for the threat/intimidation itself, in addition to the original complaint - it does not need to wait for the original case to conclude'
                ],
                authorities: ['police_fir', 'ncsc', 'ncst', 'nalsa_legal_aid', 'nhrc']
            },
            honor_based_violence: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (as amended) + general criminal law on assault/threats (BNS/IPC)',
                keyProtections: [
                    'Violence or threats motivated by an inter-caste relationship/marriage, where the victim is SC/ST, is prosecutable under the Atrocities Act with its enhanced protections (Section 18A: no preliminary inquiry; Section 18: limited anticipatory bail)',
                    'Couples facing threats can seek police protection directly from the jurisdictional police or the High Court (many High Courts run dedicated "safe house"/protection-order processes for inter-caste and inter-faith couples)',
                    'Family members who threaten violence can be booked under criminal intimidation law even before any actual harm occurs'
                ],
                authorities: ['police_fir', 'ncsc', 'ncst', 'nalsa_legal_aid', 'nhrc']
            },
            cyber_caste_harassment: {
                primaryLaw: 'SC/ST (Prevention of Atrocities) Act, 1989 (Section 3(1)(u) - caste-based abuse in electronic form) + Information Technology Act, 2000',
                keyProtections: [
                    'Posting or transmitting caste-based insults, threats, or non-consensual images electronically is covered both by the Atrocities Act and IT Act provisions on privacy violation/obscene content',
                    'The National Cyber Crime Reporting Portal accepts complaints without requiring an in-person police visit first, and can request platform takedowns',
                    'Screenshots/links should be preserved before reporting, since content can be deleted by the poster or the platform'
                ],
                authorities: ['cybercrime_portal', 'police_fir', 'ncsc', 'ncst', 'nalsa_legal_aid']
            }
        };

        // Guidance for clinical/crisis findings that aren't caste-atrocity
        // specific but still have real legal/rights dimensions.
        this.clinicalLegalGuidance = {
            suicide_risk: {
                primaryLaw: 'Mental Healthcare Act, 2017',
                keyProtections: [
                    'A person who attempts suicide is presumed to be under severe stress and is protected from prosecution for it (Section 115) - it should be treated as a health and welfare matter, not a crime',
                    'The government is required to provide care, treatment, and rehabilitation to a person who has attempted suicide, free of cost where needed'
                ],
                authorities: ['nalsa_legal_aid']
            },
            mental_health_general: {
                primaryLaw: 'Mental Healthcare Act, 2017',
                keyProtections: [
                    'Right to access mental healthcare and treatment from government-run or government-funded services (Sections 18-19)',
                    'Insurance providers are required to cover mental illness on the same basis as physical illness (Section 21)',
                    'Right to community living and protection from cruel or degrading treatment while receiving care'
                ],
                authorities: ['nalsa_legal_aid']
            },
            domestic_violence: {
                primaryLaw: 'Protection of Women from Domestic Violence Act, 2005',
                keyProtections: [
                    'Right to a protection order, residence order (right to stay in the shared household), and monetary relief through a Magistrate',
                    'A Protection Officer must be appointed in every district to assist with filing a complaint - this can be a civil remedy alongside or instead of a criminal one'
                ],
                authorities: ['women_helpline', 'nalsa_legal_aid', 'police_fir']
            },
            // ✅ NEW: workplace sexual harassment had no legal guidance
            // reachable anywhere in this file - a real, common disclosure
            // type (textAnalyzer.js's trauma category already has real-world
            // phrasing like "supervisor made comments and touched me
            // inappropriately"). Section numbers verified against the POSH
            // Act, 2013 directly - it's a standalone special Act like the
            // Atrocities Act, not renumbered by the BNS/IPC transition, so
            // citing its section numbers is safe under this file's own
            // scope rule (see the file header).
            workplace_sexual_harassment: {
                primaryLaw: 'Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (POSH Act)',
                keyProtections: [
                    'Every workplace with 10 or more employees must have an Internal Committee (IC) to receive and inquire into complaints (Section 4); smaller establishments, and complaints against the employer, go to the district\'s Local Committee instead (Section 6)',
                    'A complaint can ordinarily be filed within 3 months of the incident, extendable by another 3 months if the Committee is satisfied the delay was justified (Section 9)',
                    'The Committee must complete its inquiry within 90 days, and the employer must act on its recommendations within 60 days after that (Section 11)',
                    'Physical contact is not required for conduct to count as sexual harassment - unwelcome remarks, conduct, or a hostile environment are enough (Apparel Export Promotion Council v. A.K. Chopra, 1999)',
                    'The complainant can request interim relief during the inquiry, such as transfer of either party or leave'
                ],
                authorities: ['nalsa_legal_aid', 'police_fir', 'women_helpline']
            },
            // ✅ NEW: intimidation/stalking is one of this tool's detected
            // categories (textAnalyzer.js already matches phrases like
            // "tracks my location", "follows me everywhere", "stalking my
            // socials"), but had no standalone legal guidance of its own
            // outside the SC/ST-specific cyber_caste_harassment entry -
            // meaning a stalking disclosure with no caste dimension got no
            // legal information at all. IT Act section numbers verified
            // directly - it's a standalone special Act, not renumbered by
            // the BNS/IPC transition. Deliberately does NOT cite a BNS/IPC
            // stalking/criminal-intimidation section number, consistent
            // with this file's stated policy on general (non-special-Act)
            // offenses (see file header).
            stalking_and_intimidation: {
                primaryLaw: 'General criminal law on stalking and criminal intimidation + Information Technology Act, 2000 for online conduct',
                keyProtections: [
                    'Repeatedly following, contacting, or monitoring someone against their wishes, or threatening them to cause alarm, are criminal offences that can be reported to the police regardless of the relationship to the person doing it',
                    'Online stalking, non-consensual sharing of images, or transmitting obscene/sexually explicit content electronically are separately covered by the Information Technology Act, 2000 (Section 66E - violation of privacy; Sections 67 and 67A - obscene or sexually explicit electronic content)',
                    'The National Cyber Crime Reporting Portal (1930 / cybercrime.gov.in) accepts complaints without an in-person police visit first and can request platform takedowns',
                    'Screenshots, messages, and call logs should be preserved before reporting - evidence can otherwise be deleted by the person responsible or the platform'
                ],
                authorities: ['police_fir', 'cybercrime_portal', 'nalsa_legal_aid', 'women_helpline']
            }
        };
    }

    /**
     * Build guidance from an SCSTTrainer.analyze()-shaped result. Merges
     * provisions/authorities across every matched pattern so a case with
     * multiple patterns gets one consolidated answer rather than picking
     * only the single highest-severity one.
     */
    getGuidanceForSCST(scstResult) {
        if (!scstResult || !scstResult.patterns || scstResult.patterns.length === 0) {
            return null;
        }

        const matchedProvisions = [];
        const authoritySet = new Set();

        for (const pattern of scstResult.patterns) {
            const provisionKey = this.patternKeyAliases[pattern.name] || pattern.name;
            const provision = this.scstProvisions[provisionKey];
            if (provision) {
                matchedProvisions.push({
                    incidentType: pattern.name,
                    description: pattern.description,
                    ...provision
                });
                for (const authKey of provision.authorities) {
                    authoritySet.add(authKey);
                }
            }
        }

        // Baseline Atrocities Act rights apply whenever ANY SC/ST pattern is
        // matched, regardless of which specific one - these are general to
        // the Act, not tied to a single offence type.
        authoritySet.add('police_fir');
        authoritySet.add('nalsa_legal_aid');
        authoritySet.add('victim_compensation');

        // Surface landmark case law relevant to the matched pattern(s), for
        // general awareness only - see the caveat on landmarkCaseLaw above.
        const matchedPatternNames = scstResult.patterns.map(p => p.name);
        const relevantCaseLaw = this.landmarkCaseLaw.filter(c =>
            matchedPatternNames.some(name => c.relevance.includes(name)) ||
            c.relevance.includes('general SC/ST Act procedure')
        );

        return {
            applicable: true,
            baselineRights: [
                'No preliminary inquiry is required before an FIR is registered under the Atrocities Act (Section 18A)',
                'Free legal aid regardless of income, through NALSA (Section 12(a), Legal Services Authorities Act, 1987)',
                'Compensation can be payable at multiple stages - FIR registration, chargesheet, and conviction - not only at the end of a trial'
            ],
            matchedProvisions: matchedProvisions,
            authorities: Array.from(authoritySet).map(key => this.redressalChannels[key]),
            relevantCaseLaw: relevantCaseLaw,
            priorityReview: !!scstResult.requiresPriorityReview,
            disclaimer: this.disclaimer
        };
    }

    _isLetterOrDigit(ch) {
        return !!ch && /[\p{L}\p{N}]/u.test(ch);
    }

    // Same word-boundary phrase matching used throughout this codebase
    // (humanIntelligence.js, cssrsLadder.js each keep their own small copy
    // rather than sharing a module - this follows that existing pattern).
    _containsPhrase(textLower, phrase) {
        let fromIndex = 0;
        while (true) {
            const pos = textLower.indexOf(phrase, fromIndex);
            if (pos === -1) return false;
            const before = pos > 0 ? textLower[pos - 1] : '';
            const after = pos + phrase.length < textLower.length ? textLower[pos + phrase.length] : '';
            if (!this._isLetterOrDigit(before) && !this._isLetterOrDigit(after)) return true;
            fromIndex = pos + 1;
        }
    }

    /**
     * Build guidance from clinical findings (e.g. the hybridDecision /
     * expertSystem output). `text` and `dangerAssessment` are optional -
     * omitting them keeps every existing caller working exactly as before,
     * just without the workplace-context disambiguation and the
     * Danger-Assessment-informed domestic_violence trigger below.
     */
    getGuidanceForClinical(finalScores = {}, expertRules = [], text = '', dangerAssessment = null) {
        const applicableKeys = [];
        const textLower = (text || '').toLowerCase();

        if ((finalScores.suicidal_ideation || 0) > 0.3) {
            applicableKeys.push('suicide_risk');
        }
        if ((finalScores.depression || 0) > 0.3 || (finalScores.anxiety || 0) > 0.3 || (finalScores.trauma || 0) > 0.3) {
            applicableKeys.push('mental_health_general');
        }

        const activeSuicideRule = expertRules.find(r => r.id === 'suicide_rule' && r.activated);
        if (activeSuicideRule && !applicableKeys.includes('suicide_risk')) {
            applicableKeys.push('suicide_risk');
        }

        // ✅ BUG FIX: clinicalLegalGuidance.domestic_violence was fully
        // written but NOTHING here ever added 'domestic_violence' to
        // applicableKeys - it was completely unreachable, silently, since
        // the day it was written. Gated on humanIntelligence.js's Danger-
        // Assessment-inspired lethality check (strangulation, weapon,
        // death threats, etc.) when available - a much stronger, validated
        // signal than a generic score threshold - or, as a fallback for
        // lower-severity cases that don't cross that bar, the combination
        // of high vulnerability + intimidation that indicates coercive
        // control.
        if ((dangerAssessment && dangerAssessment.elevatedLethalityRisk) ||
            ((finalScores.vulnerability || 0) > 0.5 && (finalScores.intimidation || 0) > 0.4)) {
            applicableKeys.push('domestic_violence');
        }

        // ✅ NEW: workplace sexual harassment (POSH Act) had no legal
        // guidance reachable anywhere - see clinicalLegalGuidance's note.
        // Gated on an explicit workplace-context word alongside
        // trauma/intimidation, since the score pattern alone can't
        // distinguish workplace harassment from domestic or
        // stranger-perpetrated harassment.
        const workplaceContextWords = ['workplace', 'office', 'supervisor', 'manager', 'boss',
            'coworker', 'co-worker', 'colleague', 'my job', 'at work'];
        if (((finalScores.trauma || 0) > 0.3 || (finalScores.intimidation || 0) > 0.3) &&
            workplaceContextWords.some(w => this._containsPhrase(textLower, w))) {
            applicableKeys.push('workplace_sexual_harassment');
        }

        // ✅ NEW: stalking/intimidation guidance, applicable regardless of
        // who is doing it - stranger, ex-partner, or coworker - see
        // clinicalLegalGuidance's note.
        if ((finalScores.intimidation || 0) > 0.3) {
            applicableKeys.push('stalking_and_intimidation');
        }

        if (applicableKeys.length === 0) return null;

        const authoritySet = new Set();
        const matchedProvisions = applicableKeys.map(key => {
            const g = this.clinicalLegalGuidance[key];
            for (const a of g.authorities) authoritySet.add(a);
            return { incidentType: key, ...g };
        });

        // ✅ NEW: clinical guidance never surfaced relevant case law at all
        // before this fix - only the SC/ST path did, so e.g. Vishaka could
        // never appear for a workplace-harassment-only disclosure with no
        // caste dimension. Reuses the same landmarkCaseLaw list, filtered
        // by the clinical guidance keys that matched.
        const relevantCaseLaw = this.landmarkCaseLaw.filter(c =>
            applicableKeys.some(key => c.relevance.includes(key))
        );

        return {
            applicable: true,
            matchedProvisions: matchedProvisions,
            authorities: Array.from(authoritySet).map(key => this.redressalChannels[key]),
            relevantCaseLaw: relevantCaseLaw,
            disclaimer: this.disclaimer
        };
    }

    /**
     * Combined "Legal tab" payload: SC/ST guidance + clinical/rights
     * guidance in one response, deduplicating authorities across both.
     * `text` and `dangerAssessment` are optional - see getGuidanceForClinical.
     */
    getCombinedGuidance(scstResult, finalScores = {}, expertRules = [], text = '', dangerAssessment = null) {
        const scst = this.getGuidanceForSCST(scstResult);
        const clinical = this.getGuidanceForClinical(finalScores, expertRules, text, dangerAssessment);

        if (!scst && !clinical) {
            return {
                applicable: false,
                message: 'No specific legal pattern detected in this text. General helplines and NALSA legal aid (15100) remain available regardless.',
                authorities: [this.redressalChannels.nalsa_legal_aid],
                disclaimer: this.disclaimer
            };
        }

        const authorityMap = new Map();
        for (const section of [scst, clinical]) {
            if (!section) continue;
            for (const auth of section.authorities) {
                authorityMap.set(auth.name, auth);
            }
        }

        return {
            applicable: true,
            priorityReview: !!(scst && scst.priorityReview),
            scstGuidance: scst,
            clinicalGuidance: clinical,
            allAuthorities: Array.from(authorityMap.values()),
            disclaimer: this.disclaimer
        };
    }
}

export default LegalGuidance;
# Architecture Diagrams

Visual representation of the overall architecture for mpage, xcli-core, and xbrowser.

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Application Layer                            │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │     xbrowser    │  │   Other Apps    │  │  Custom Apps    │   │
│  │                 │  │                 │  │                 │   │
│  │  Browser CLI    │  │  Database CLI   │  │  API Tools      │   │
│  │  Plugins        │  │  Scrapers       │  │  Automation     │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
└───────────┼───────────────────┼───────────────────┼────────────────┘
            │                   │                   │
            ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Framework Layer                                 │
│                                                                   │
│              ┌─────────────────────────────┐                       │
│              │      @dyyz1993/xcli-core    │                       │
│              │                             │                       │
│              │  • Plugin System            │                       │
│              │  • Command Registration      │                       │
│              │  • Scope Management          │                       │
│              │  • Session Management        │                       │
│              │  • Daemon System             │                       │
│              │  • WebSocket Support         │                       │
│              │  • Output Formatting         │                       │
│              │  • Scaffolding               │                       │
│              └──────────────┬──────────────┘                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Engine Layer                                  │
│                                                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐    │
│  │  @dyyz1993/xpage (mpage)│  │     Playwright             │    │
│  │                         │  │                             │    │
│  │  • Command Execution    │  │  • Browser Launch          │    │
│  │  • Recording/Playback   │  │  • Page Management         │    │
│  │  • Structure Extraction │  │  • Element Interaction      │    │
│  │  • Accessibility Tree   │  │  • CDP Connection          │    │
│  └─────────────────────────┘  └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Browser Layer                                  │
│                                                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐    │
│  │      Chromium           │  │      Chrome                 │    │
│  │                         │  │                             │    │
│  │  • CDP Endpoint         │  │  • Remote Debugging         │    │
│  │  • Headless Support     │  │  • Extension Support        │    │
│  └─────────────────────────┘  └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Mermaid Diagram: Overall Architecture

```mermaid
graph TB
    subgraph Applications["Application Layer"]
        xbrowser[xbrowser<br/>Browser CLI]
        other[Other Apps<br/>Database CLI, Scrapers]
        custom[Custom Apps<br/>API Tools, Automation]
    end

    subgraph Framework["Framework Layer"]
        xcli[@dyyz1993/xcli-core<br/>Plugin System<br/>Command Registration<br/>Scope Management<br/>Session Management<br/>Daemon System<br/>WebSocket Support<br/>Output Formatting<br/>Scaffolding]
    end

    subgraph Engine["Engine Layer"]
        mpage[@dyyz1993/xpage<br/>Command Execution<br/>Recording/Playback<br/>Structure Extraction<br/>Accessibility Tree]
        playwright[Playwright<br/>Browser Launch<br/>Page Management<br/>Element Interaction<br/>CDP Connection]
    end

    subgraph Browser["Browser Layer"]
        chromium[Chromium<br/>CDP Endpoint<br/>Headless Support]
        chrome[Chrome<br/>Remote Debugging<br/>Extension Support]
    end

    xbrowser --> xcli
    other --> xcli
    custom --> xcli
    xcli --> mpage
    xcli --> playwright
    mpage --> playwright
    playwright --> chromium
    playwright --> chrome

    style Applications fill:#e1f5ff
    style Framework fill:#fff4e1
    style Engine fill:#ffe1e1
    style Browser fill:#e1ffe1
```

## xcli-Core Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      xcli-Core Framework                            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      Core Layer                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Core Class    │  │  Plugin Loader  │  │ Scope Registry   │  │
│  │                  │  │                  │  │                  │  │
│  │ • Initialization │  │ • Plugin Loading │  │ • Scope Levels   │  │
│  │ • Command Route  │  │ • Hot Reload    │  │ • Validation     │  │
│  │ • Startup        │  │ • TS Compilation│  │ • Context Check  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     Service Layer                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Session Manager  │  │ Daemon Manager   │  │ WebSocket Server │  │
│  │                  │  │                  │  │                  │  │
│  │ • CRUD Operations│  │ • Process Mgmt   │  │ • Real-time Comms│  │
│  │ • Archival       │  │ • Worker Pool    │  │ • Channels       │  │
│  │ • Persistence    │  │ • HTTP API       │  │ • Broadcasting   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Output Formatter│  │  Help Generator  │  │ Scaffold Engine  │  │
│  │                  │  │                  │  │                  │  │
│  │ • Text/JSON/YAML │  │ • Command Help   │  │ • Template Gen   │  │
│  │ • Pretty Print   │  │ • Plugin Help    │  │ • Variable Subst │  │
│  │ • Error Format   │  │ • Examples       │  │ • File Creation  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Foundation Layer                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Arg Parser    │  │   Validator      │  │    Storage       │  │
│  │                  │  │                  │  │                  │  │
│  │ • Tokenization   │  │ • Zod Validation │  │ • RC Config      │  │
│  │ • Short Options  │  │ • Type Checking  │  │ • Plugin Config  │  │
│  │ • Positional Args│  │ • Error Messages │  │ • Session Data   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Mermaid Diagram: xcli-Core Architecture

```mermaid
graph TB
    subgraph Core["Core Layer"]
        core[Core Class<br/>Initialization<br/>Command Route<br/>Startup]
        loader[Plugin Loader<br/>Plugin Loading<br/>Hot Reload<br/>TS Compilation]
        scope[Scope Registry<br/>Scope Levels<br/>Validation<br/>Context Check]
    end

    subgraph Services["Service Layer"]
        session[Session Manager<br/>CRUD Operations<br/>Archival<br/>Persistence]
        daemon[Daemon Manager<br/>Process Mgmt<br/>Worker Pool<br/>HTTP API]
        ws[WebSocket Server<br/>Real-time Comms<br/>Channels<br/>Broadcasting]
        output[Output Formatter<br/>Text/JSON/YAML<br/>Pretty Print<br/>Error Format]
        help[Help Generator<br/>Command Help<br/>Plugin Help<br/>Examples]
        scaffold[Scaffold Engine<br/>Template Gen<br/>Variable Subst<br/>File Creation]
    end

    subgraph Foundation["Foundation Layer"]
        parser[Arg Parser<br/>Tokenization<br/>Short Options<br/>Positional Args]
        validator[Validator<br/>Zod Validation<br/>Type Checking<br/>Error Messages]
        storage[Storage<br/>RC Config<br/>Plugin Config<br/>Session Data]
    end

    core --> session
    core --> daemon
    core --> ws
    core --> output
    core --> help
    core --> scaffold
    loader --> core
    scope --> core
    parser --> validator
    validator --> core
    storage --> session
    storage --> daemon

    style Core fill:#e1f5ff
    style Services fill:#fff4e1
    style Foundation fill:#ffe1e1
```

## xbrowser Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        xbrowser CLI                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     Entry Layer                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  bin/cli.ts     │  │  Router         │  │  Chain Parser    │  │
│  │                  │  │                  │  │                  │  │
│  │ • CLI Entry      │  │ • Route Logic    │  │ • Chain Syntax   │  │
│  │ • Arg Parsing    │  │ • Command Match  │  │ • Separator Recog │  │
│  │ • Error Handling │  │ • Subcommand     │  │ • Arg Parsing    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Execution Layer                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Executor       │  │ Command Registry │  │  Scope System    │  │
│  │                  │  │                  │  │                  │  │
│  │ • Execute Command│  │ • Command Lookup │  │ • Scope Levels   │  │
│  │ • Execute Chain  │  │ • Parameter Valid│  │ • Context Check  │  │
│  │ • Result Format  │  │ • Handler Call   │  │ • Error Handling │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Browser Manager  │  │  Session Manager │  │  Plugin Loader   │  │
│  │                  │  │                  │  │                  │  │
│  │ • Browser Launch │  │ • Create Session │  │ • Plugin Load    │  │
│  │ • CDP Connect    │  │ • Close Session  │  │ • Command Reg    │  │
│  │ • Page Management│  │ • List Sessions  │  │ • Plugin Install │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Feature Layer                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Recorder      │  │    Player        │  │   Converter      │  │
│  │                  │  │                  │  │                  │  │
│  │ • Event Capture  │  │ • YAML Playback  │  │ • JS Generation  │  │
│  │ • YAML Export    │  │ • Slow Motion    │  │ • Python Gen     │  │
│  │ • Session Data   │  │ • Error Handling │  │ • Bash Gen       │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Built-in Cmds   │  │   Daemon        │  │  WebSocket       │  │
│  │                  │  │                  │  │                  │  │
│  │ • Config         │  │ • Process Mgmt   │  │ • Server         │  │
│  │ • Plugin         │  │ • Worker Pool    │  │ • Preview        │  │
│  │ • Session        │  │ • Status Check   │  │ • Real-time      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     Browser Commands                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Navigation      │  │  Interaction     │  │   Query          │  │
│  │  goto, back...   │  │  click, fill...  │  │  html, text...   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │     Wait         │  │    Screenshot    │  │   Storage        │  │
│  │  wait, timeout   │  │  screenshot,     │  │  cookies,        │  │
│  │                  │  │  snapshot        │  │  localStorage    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Mermaid Diagram: xbrowser Architecture

```mermaid
graph TB
    subgraph Entry["Entry Layer"]
        cli[bin/cli.ts<br/>CLI Entry<br/>Arg Parsing<br/>Error Handling]
        router[Router<br/>Route Logic<br/>Command Match<br/>Subcommand]
        chain[Chain Parser<br/>Chain Syntax<br/>Separator Recog<br/>Arg Parsing]
    end

    subgraph Execution["Execution Layer"]
        executor[Executor<br/>Execute Command<br/>Execute Chain<br/>Result Format]
        registry[Command Registry<br/>Command Lookup<br/>Parameter Valid<br/>Handler Call]
        scope[Scope System<br/>Scope Levels<br/>Context Check<br/>Error Handling]
        browser[Browser Manager<br/>Browser Launch<br/>CDP Connect<br/>Page Management]
        session[Session Manager<br/>Create Session<br/>Close Session<br/>List Sessions]
        plugin[Plugin Loader<br/>Plugin Load<br/>Command Reg<br/>Plugin Install]
    end

    subgraph Features["Feature Layer"]
        recorder[Recorder<br/>Event Capture<br/>YAML Export<br/>Session Data]
        player[Player<br/>YAML Playback<br/>Slow Motion<br/>Error Handling]
        converter[Converter<br/>JS Generation<br/>Python Gen<br/>Bash Gen]
        builtin[Built-in Cmds<br/>Config<br/>Plugin<br/>Session]
        daemon[Daemon<br/>Process Mgmt<br/>Worker Pool<br/>Status Check]
        ws[WebSocket<br/>Server<br/>Preview<br/>Real-time]
    end

    subgraph Commands["Browser Commands"]
        nav[Navigation<br/>goto, back, forward]
        interact[Interaction<br/>click, fill, type]
        query[Query<br/>html, text, getProperty]
        wait[Wait<br/>wait, waitForTimeout]
        screenshot[Screenshot<br/>screenshot, snapshot]
        storage[Storage<br/>cookies, localStorage]
    end

    cli --> router
    router --> chain
    router --> executor
    chain --> executor
    executor --> registry
    executor --> scope
    executor --> browser
    executor --> session
    executor --> plugin
    plugin --> registry
    registry --> commands
    browser --> commands
    executor --> recorder
    executor --> player
    executor --> converter
    executor --> builtin
    executor --> daemon
    executor --> ws

    style Entry fill:#e1f5ff
    style Execution fill:#fff4e1
    style Features fill:#ffe1e1
    style Commands fill:#e1ffe1
```

## mpage Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      @dyyz1993/xpage Engine                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Command System                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Command Defs   │  │  Command Parser  │  │  Command Handler │  │
│  │                  │  │                  │  │                  │  │
│  │ • 35+ Commands   │  │ • Chain Parsing  │  │ • Execute Logic  │  │
│  │ • Zod Schemas    │  │ • Arg Parsing    │  │ • Result Return  │  │
│  │ • Metadata       │  │ • Validation     │  │ • Error Handling │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Recording System                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Recorder Ctrl   │  │  Event Capture   │  │  Session Data    │  │
│  │                  │  │                  │  │                  │  │
│  │ • Start Recording│  │ • Click Events   │  │ • UUID Generation│  │
│  │ • Stop Recording │  │ • Input Events   │  │ • Timestamps     │  │
│  │ • YAML Export    │  │ • Navigate Events│  │ • Page State     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Playback System                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Playback Engine  │  │  Event Executor  │  │  Result Handler  │  │
│  │                  │  │                  │  │                  │  │
│  │ • Load YAML      │  │ • Click Execute  │  │ • Success/Fail   │  │
│  │ • Parse Events   │  │ • Input Execute  │  │ • Error Log      │  │
│  │ • Slow Motion    │  │ • Navigate Exec  │  │ • Statistics     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Extraction System                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Structure Extract│  │  Accessibility   │  │  Query Engine    │  │
│  │                  │  │                  │  │                  │  │
│  │ • DOM Tree       │  │ • ARIA Tree      │  │ • CSS Selector   │  │
│  │ • Semantic Layout│  │ • Snapshot       │  │ • Text Search    │  │
│  │ • YAML Export    │  │ • YAML Format    │  │ • Attribute Get  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Session Management                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Session Storage  │  │  Session API     │  │  File System     │  │
│  │                  │  │                  │  │                  │  │
│  │ • In-Memory      │  │ • CRUD Ops       │  │ • Save YAML      │  │
│  │ • Disk Persistence│  │ • List Sessions  │  │ • Load YAML      │  │
│  │ • Metadata Store  │  │ • Delete Sessions│  │ • Delete Files   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Mermaid Diagram: mpage Architecture

```mermaid
graph TB
    subgraph Commands["Command System"]
        defs[Command Defs<br/>35+ Commands<br/>Zod Schemas<br/>Metadata]
        parser[Command Parser<br/>Chain Parsing<br/>Arg Parsing<br/>Validation]
        handler[Command Handler<br/>Execute Logic<br/>Result Return<br/>Error Handling]
    end

    subgraph Recording["Recording System"]
        recorder[Recorder Ctrl<br/>Start Recording<br/>Stop Recording<br/>YAML Export]
        capture[Event Capture<br/>Click Events<br/>Input Events<br/>Navigate Events]
        session[Session Data<br/>UUID Generation<br/>Timestamps<br/>Page State]
    end

    subgraph Playback["Playback System"]
        engine[Playback Engine<br/>Load YAML<br/>Parse Events<br/>Slow Motion]
        executor[Event Executor<br/>Click Execute<br/>Input Execute<br/>Navigate Exec]
        result[Result Handler<br/>Success/Fail<br/>Error Log<br/>Statistics]
    end

    subgraph Extraction["Extraction System"]
        structure[Structure Extract<br/>DOM Tree<br/>Semantic Layout<br/>YAML Export]
        a11y[Accessibility<br/>ARIA Tree<br/>Snapshot<br/>YAML Format]
        query[Query Engine<br/>CSS Selector<br/>Text Search<br/>Attribute Get]
    end

    subgraph SessionMgmt["Session Management"]
        storage[Session Storage<br/>In-Memory<br/>Disk Persistence<br/>Metadata Store]
        api[Session API<br/>CRUD Ops<br/>List Sessions<br/>Delete Sessions]
        fs[File System<br/>Save YAML<br/>Load YAML<br/>Delete Files]
    end

    parser --> defs
    parser --> handler
    recorder --> capture
    recorder --> session
    capture --> session
    engine --> executor
    executor --> result
    engine --> parser
    handler --> query
    handler --> structure
    handler --> a11y
    api --> storage
    storage --> fs
    recorder --> api
    engine --> api

    style Commands fill:#e1f5ff
    style Recording fill:#fff4e1
    style Playback fill:#ffe1e1
    style Extraction fill:#e1ffe1
    style SessionMgmt fill:#f3e1ff
```

## Component Relationships

```mermaid
graph LR
    subgraph Projects["Projects"]
        mpage[@dyyz1993/xpage<br/>Browser Engine]
        xcli[@dyyz1993/xcli-core<br/>CLI Framework]
        xbrowser[@dyyz1993/xbrowser<br/>Browser CLI]
    end

    mpage -.->|Used By| xbrowser
    xcli -->|Depends On| xbrowser
    mpage -.->|Reference| xcli

    style Projects fill:#f8f9fa
    style mpage fill:#d1ecf1
    style xcli fill:#fff3cd
    style xbrowser fill:#d4edda
```

## Data Flow: Command Execution

```mermaid
sequenceDiagram
    participant U as User
    participant C as CLI
    participant R as Router
    participant E as Executor
    participant B as Browser Manager
    participant P as Playwright

    U->>C: xbrowser goto https://example.com
    C->>R: routeCommand()
    R->>R: parseCommand()
    R->>E: executeCommand()
    E->>B: getBrowser()
    B->>P: chromium.launch()
    P-->>B: Browser instance
    B->>P: browser.newPage()
    P-->>B: Page instance
    B-->>E: Browser + Page
    E->>E: validateArgs()
    E->>E: constructContext()
    E->>E: command.handler()
    E->>P: page.goto(url)
    P-->>E: Response
    E-->>R: ExecutionResult
    R-->>C: Formatted Output
    C-->>U: Display Result
```

## Data Flow: Recording

```mermaid
sequenceDiagram
    participant U as User
    participant R as Recorder
    participant B as Browser
    participant P as Page
    participant S as Storage

    U->>R: record start
    R->>B: getBrowser()
    R->>P: page.goto(url)
    R->>R: setupEventListeners()

    loop User Interactions
        U->>P: Click element
        P->>R: click event
        R->>R: captureEvent()
        R->>R: addTimestamp()
        R->>R: saveToEvents()
    end

    U->>R: record stop
    R->>R: calculateDuration()
    R->>R: createRecordingSession()
    R->>S: saveYAML()
    S-->>U: Recording file
```

## Data Flow: Playback

```mermaid
sequenceDiagram
    participant U as User
    participant E as PlaybackEngine
    participant F as File System
    participant B as Browser
    participant P as Page

    U->>E: replay recording.yaml
    E->>F: loadYAML()
    F-->>E: RecordingSession
    E->>B: getBrowser()
    E->>P: page.goto(startUrl)

    loop Each Event
        E->>E: parseEvent()
        alt Event is click
            E->>P: page.click(selector)
        alt Event is input
            E->>P: page.fill(selector, value)
        alt Event is keydown
            E->>P: page.keyboard.press(key)
        end
        alt slowMo enabled
            E->>E: wait(slowMo)
        end
    end

    E-->>U: PlaybackResult
```

## Key Architectural Decisions

### 1. Why Three Separate Projects?

```
┌─────────────────────────────────────────────────────────────────┐
│ Separation of Concerns                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ @dyyz1993/xpage (mpage)                                        │
│ • Focus: Browser automation engine                               │
│ • Audience: Library developers                                  │
│ • Scope: Low-level browser operations                            │
│                                                                  │
│ @dyyz1993/xcli-core                                              │
│ • Focus: CLI framework                                           │
│ • Audience: CLI tool developers                                 │
│ • Scope: Framework capabilities (plugins, daemon, etc.)          │
│                                                                  │
│ @dyyz1993/xbrowser                                               │
│ • Focus: End-user browser automation                              │
│ • Audience: CLI users                                           │
│ • Scope: Complete CLI tool                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. xbrowser Doesn't Depend on mpage

```mermaid
graph LR
    xcli[xcli-core]
    playwright[Playwright]
    xbrowser[xbrowser]

    xcli -->|Uses| xbrowser
    playwright -->|Uses| xbrowser

    style xcli fill:#fff3cd
    style playwright fill:#d1ecf1
    style xbrowser fill:#d4edda

    note[xbrowser uses Playwright directly<br/>to reduce dependency complexity] --> xbrowser
```

**Reasons:**
- xbrowser needs full Playwright API
- Avoids abstraction layer
- Reduces dependency complexity
- Direct access to CDP features

### 3. Plugin Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Plugin System Design                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Plugin Structure:                                                │
│ • index.ts - Plugin entry (TypeScript)                           │
│ • package.json - Plugin metadata                                 │
│ • README.md - Documentation                                      │
│                                                                  │
│ Plugin Loading:                                                  │
│ • Jiti compiles TypeScript on-the-fly                           │
│ • Scans multiple plugin directories                             │
│ • Hot reload support                                             │
│ • Plugin isolation                                              │
│                                                                  │
│ Plugin API:                                                      │
│ • xcli.createSite() - Create plugin site                         │
│ • site.command() - Register commands                            │
│ • site.login/logout() - Event handlers                           │
│ • ctx.storage - Per-plugin storage                              │
│ • ctx.output - Output utilities                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Session Management

```
┌─────────────────────────────────────────────────────────────────┐
│ Session Lifecycle                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Create:                                                          │
│ 1. Generate UUID                                                 │
│ 2. Initialize metadata                                          │
│ 3. Store in memory                                              │
│ 4. Persist to disk                                              │
│                                                                  │
│ Use:                                                             │
│ 1. Retrieve session by ID                                       │
│ 2. Restore context                                              │
│ 3. Execute commands                                             │
│ 4. Update metadata                                              │
│                                                                  │
│ Close:                                                           │
│ 1. Remove from memory                                           │
│ 2. Archive command history                                     │
│ 3. Delete disk files                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## See Also

- [mpage Documentation](../mpage/README.md)
- [xcli-core Documentation](../packages/core/README.md)
- [xbrowser Documentation](../xbrowser/README.md)

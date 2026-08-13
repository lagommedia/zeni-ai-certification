import "dotenv/config";
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local", override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Prisma,
  Role,
  CourseLevel,
  EnrollmentStatus,
  NotificationType,
} from "../src/generated/prisma/client";

const adapter = new PrismaPg(process.env.DATABASE_URL ?? "");
const prisma = new PrismaClient({ adapter });

function certNumber(seed: string) {
  return `ZC-${seed.toUpperCase()}`;
}

const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
];

type QuizDef = { prompt: string; choices: string[]; correct: number };

function mcq(prompt: string, choices: string[], correct: number): QuizDef {
  return { prompt, choices, correct };
}

type ContentBlockDef =
  | { type: "PARAGRAPH"; body: string }
  | { type: "HEADING"; heading: string }
  | { type: "CALLOUT"; heading: string; body: string; variant: "NEUTRAL" | "HIGHLIGHT" | "ACTION" };

type ModuleDef = { title: string; subtitle?: string; quiz: QuizDef; blocks?: ContentBlockDef[] };

async function main() {
  await prisma.notification.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.moduleProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.quizChoice.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: "Ava Sinclair",
      email: "admin@zeni.ai",
      role: Role.ADMIN,
      title: "Platform Administrator",
      avatarColor: "#D5E7E3",
    },
  });

  const noah = await prisma.user.create({
    data: {
      name: "Noah Patel",
      email: "noah@zeni.ai",
      role: Role.USER,
      title: "Staff Accountant",
      avatarColor: "#D2E3E9",
    },
  });

  const maya = await prisma.user.create({
    data: {
      name: "Maya Chen",
      email: "maya@zeni.ai",
      role: Role.USER,
      title: "Bookkeeping Specialist",
      avatarColor: "#F7E0C4",
    },
  });

  const courseDefs: {
    title: string;
    description: string;
    category: string;
    level: CourseLevel;
    coverColor: string;
    modules: ModuleDef[];
    finalExam: QuizDef[];
  }[] = [
    {
      title: "Zeni Platform Fundamentals",
      description:
        "Get oriented in the Zeni platform: navigating the dashboard, understanding the AI CFO, and connecting your financial accounts.",
      category: "Onboarding",
      level: CourseLevel.BEGINNER,
      coverColor: "#366170",
      modules: [
        {
          title: "Welcome to Zeni",
          subtitle: "A finance team, not just a finance tool",
          quiz: mcq(
            "What is Zeni best described as?",
            [
              "A \"Finance-as-a-Service\" platform combining AI and a human finance team",
              "A payroll-only processing tool",
              "A customer support ticketing system",
              "A social media scheduler",
            ],
            0
          ),
          blocks: [
            {
              type: "CALLOUT",
              variant: "NEUTRAL",
              heading: "BY THE END OF THIS MODULE YOU CAN",
              body: "- Explain what Zeni is and who it's for\n- Describe how the AI CFO fits into your day-to-day\n- Know where to go first inside the platform",
            },
            { type: "HEADING", heading: "Why teams choose Zeni" },
            {
              type: "PARAGRAPH",
              body: "Zeni pairs **AI-powered bookkeeping** with a dedicated team of accountants and fractional CFOs, so you get software speed with human judgment when it matters.",
            },
            {
              type: "CALLOUT",
              variant: "HIGHLIGHT",
              heading: "THE HABIT THAT MATTERS MOST",
              body: "Check your dashboard every Monday morning. A five-minute habit catches issues weeks before they become expensive ones.",
            },
            {
              type: "CALLOUT",
              variant: "ACTION",
              heading: "NOW YOU",
              body: "Open the dashboard and find your current cash balance and burn rate before moving to the next module.",
            },
          ],
        },
        {
          title: "Navigating Your Dashboard",
          quiz: mcq(
            "Which of these gives you a quick snapshot of your company's financial health on the Zeni dashboard?",
            ["Cash, burn, and runway", "Your email inbox", "Your calendar invites", "Your team's chat messages"],
            0
          ),
        },
        {
          title: "Connecting Bank & Card Accounts",
          quiz: mcq(
            "Why do you connect your bank and card accounts to Zeni?",
            [
              "So Zeni's AI can automatically pull and categorize transactions",
              "To change your bank's interest rate",
              "To order new debit cards",
              "To close your accounts",
            ],
            0
          ),
        },
        {
          title: "Understanding the AI CFO",
          quiz: mcq(
            "What role does the AI CFO play in Zeni?",
            [
              "It surfaces financial insights and helps you decide faster",
              "It replaces your legal counsel",
              "It manages your company's hiring",
              "It designs your office space",
            ],
            0
          ),
        },
        {
          title: "Your First Weekly Review",
          quiz: mcq(
            "What's the purpose of a weekly review in Zeni?",
            [
              "To check in on transactions and items needing your attention",
              "To reset your password",
              "To update your company logo",
              "To schedule a vacation",
            ],
            0
          ),
        },
      ],
      finalExam: [
        mcq(
          "Zeni combines AI automation with...",
          [
            "A dedicated team of human finance experts",
            "A team of software engineers only",
            "No human involvement at all",
            "A call center",
          ],
          0
        ),
        mcq(
          "The AI CFO is designed to help you...",
          [
            "Make faster, more informed financial decisions",
            "Manage your company's payroll taxes exclusively",
            "Design your website",
            "Hire new employees",
          ],
          0
        ),
        mcq(
          "Connecting your bank and card accounts allows Zeni to...",
          [
            "Automatically pull and categorize your transactions",
            "Change your bank's fees",
            "Close unused accounts",
            "Issue new debit cards",
          ],
          0
        ),
        mcq(
          "A weekly review in Zeni typically involves...",
          [
            "Checking recent transactions and items needing attention",
            "Updating your company's mission statement",
            "Filing your annual taxes",
            "Rebranding your logo",
          ],
          0
        ),
      ],
    },
    {
      title: "AI Bookkeeping Essentials",
      description:
        "Learn how Zeni's AI categorizes transactions, reconciles accounts, and keeps your books audit-ready every day.",
      category: "Bookkeeping",
      level: CourseLevel.BEGINNER,
      coverColor: "#97C3B9",
      modules: [
        {
          title: "How AI Categorization Works",
          quiz: mcq(
            "How does Zeni's AI primarily categorize your transactions?",
            [
              "By learning patterns from transaction data and your chart of accounts",
              "By randomly assigning categories",
              "By asking your customers",
              "By flipping a coin",
            ],
            0
          ),
        },
        {
          title: "Reviewing & Correcting Transactions",
          quiz: mcq(
            "What should you do if the AI miscategorizes a transaction?",
            [
              "Review and correct it so similar transactions categorize correctly next time",
              "Ignore it — it doesn't matter",
              "Delete the transaction entirely",
              "Cancel your Zeni subscription",
            ],
            0
          ),
        },
        {
          title: "Bank Reconciliation Basics",
          quiz: mcq(
            "What does bank reconciliation confirm?",
            [
              "That your books match your actual bank account balances",
              "That your website is online",
              "That your team completed payroll",
              "That your logo is up to date",
            ],
            0
          ),
        },
        {
          title: "Chart of Accounts Best Practices",
          quiz: mcq(
            "A well-organized chart of accounts helps you...",
            [
              "Get clear, accurate financial reports",
              "Increase your website traffic",
              "Reduce your office rent",
              "Improve email deliverability",
            ],
            0
          ),
        },
      ],
      finalExam: [
        mcq(
          "Zeni's AI categorizes transactions by...",
          [
            "Learning from transaction patterns and your chart of accounts",
            "Asking your customers directly",
            "Randomly assigning categories",
            "Copying a competitor's books",
          ],
          0
        ),
        mcq(
          "If a transaction is miscategorized, you should...",
          ["Review and correct it", "Delete it immediately", "Ignore it", "Cancel the vendor relationship"],
          0
        ),
        mcq(
          "Bank reconciliation confirms that...",
          [
            "Your books match your actual bank balances",
            "Your website is secure",
            "Your payroll is accurate",
            "Your taxes are filed",
          ],
          0
        ),
        mcq(
          "A well-organized chart of accounts leads to...",
          [
            "Clearer, more accurate financial reports",
            "Faster website load times",
            "Lower office rent",
            "More social media followers",
          ],
          0
        ),
      ],
    },
    {
      title: "AI Accounts Payable Mastery",
      description:
        "Master bill capture, approval workflows, and automated payments with Zeni's AI Accounts Payable product.",
      category: "Accounts Payable",
      level: CourseLevel.INTERMEDIATE,
      coverColor: "#EEBA7D",
      modules: [
        {
          title: "Bill Capture & OCR",
          quiz: mcq(
            "How does Zeni capture bill details automatically?",
            [
              "Using OCR to read and extract data from uploaded invoices",
              "By manually retyping every bill",
              "By calling each vendor",
              "By guessing amounts",
            ],
            0
          ),
        },
        {
          title: "Approval Workflows",
          quiz: mcq(
            "What is the purpose of an approval workflow for bills?",
            [
              "To ensure the right people sign off before a bill is paid",
              "To automatically delete unpaid bills",
              "To send bills to spam",
              "To hide bills from finance",
            ],
            0
          ),
        },
        {
          title: "Vendor Management",
          quiz: mcq(
            "Why is keeping vendor records up to date important?",
            [
              "It ensures accurate payments and easier reporting",
              "It changes your vendor's business hours",
              "It updates your own company logo",
              "It has no effect on payments",
            ],
            0
          ),
        },
        {
          title: "Scheduling Payments",
          quiz: mcq(
            "What's a benefit of scheduling AP payments in advance?",
            [
              "You avoid late fees and manage cash flow proactively",
              "It guarantees a discount from every vendor",
              "It cancels the invoice automatically",
              "It removes the need for approvals",
            ],
            0
          ),
        },
        {
          title: "AP Reporting",
          quiz: mcq(
            "AP reports help you understand...",
            [
              "Outstanding bills, payment timing, and vendor spend",
              "Your competitors' pricing",
              "Your team's vacation days",
              "Your website's SEO ranking",
            ],
            0
          ),
        },
      ],
      finalExam: [
        mcq(
          "OCR is used in AP to...",
          [
            "Automatically extract data from uploaded bills",
            "Translate bills into other languages",
            "Design invoice templates",
            "Send marketing emails",
          ],
          0
        ),
        mcq(
          "Approval workflows exist to...",
          [
            "Ensure the right people sign off before payment",
            "Automatically approve every bill instantly",
            "Delete duplicate vendors",
            "Hide bills from the finance team",
          ],
          0
        ),
        mcq(
          "Scheduling payments in advance helps you...",
          [
            "Avoid late fees and manage cash flow",
            "Guarantee vendor discounts",
            "Skip the approval process",
            "Eliminate the need for invoices",
          ],
          0
        ),
        mcq(
          "AP reports give visibility into...",
          [
            "Outstanding bills and vendor spend",
            "Employee vacation balances",
            "Website analytics",
            "Marketing campaign performance",
          ],
          0
        ),
      ],
    },
    {
      title: "Month-End Close with Zeni AI",
      description:
        "Run a fast, accurate month-end close using Zeni's automated checklists, accruals, and variance analysis.",
      category: "Close",
      level: CourseLevel.INTERMEDIATE,
      coverColor: "#C9ABC7",
      modules: [
        {
          title: "The AI Close Checklist",
          quiz: mcq(
            "What is the purpose of the AI close checklist?",
            [
              "To guide you through every step needed to close the books accurately each month",
              "To track employee attendance",
              "To manage your marketing campaigns",
              "To design your product roadmap",
            ],
            0
          ),
        },
        {
          title: "Accruals & Adjusting Entries",
          quiz: mcq(
            "Why do you record accruals during close?",
            [
              "To recognize revenue and expenses in the period they actually occurred",
              "To hide expenses from investors",
              "To increase your bank balance",
              "To skip tax filings",
            ],
            0
          ),
        },
        {
          title: "Flux (Variance) Analysis",
          quiz: mcq(
            "What does flux (variance) analysis help you identify?",
            [
              "Significant changes between actual results and expectations or prior periods",
              "Your website's load time",
              "Your customer's favorite color",
              "Your office's electricity bill",
            ],
            0
          ),
        },
        {
          title: "Closing the Books",
          quiz: mcq(
            "What does \"closing the books\" for the month mean?",
            [
              "Finalizing all transactions and locking the period's financial records",
              "Deleting last month's data",
              "Closing your bank account",
              "Turning off the Zeni platform",
            ],
            0
          ),
        },
      ],
      finalExam: [
        mcq(
          "The AI close checklist is designed to...",
          [
            "Guide you through every step of an accurate month-end close",
            "Track employee time off",
            "Manage social media posts",
            "Approve new hires",
          ],
          0
        ),
        mcq(
          "Accruals help recognize revenue and expenses...",
          [
            "In the period they actually occurred",
            "Only when cash changes hands",
            "At the end of the fiscal year only",
            "Whenever convenient",
          ],
          0
        ),
        mcq(
          "Flux (variance) analysis highlights...",
          [
            "Meaningful changes versus expectations or prior periods",
            "Your website's uptime",
            "Employee satisfaction scores",
            "Customer support ticket volume",
          ],
          0
        ),
        mcq(
          "Closing the books each month means...",
          [
            "Finalizing and locking that period's financial records",
            "Deleting old transactions",
            "Closing your company's bank account",
            "Pausing all future transactions",
          ],
          0
        ),
      ],
    },
    {
      title: "Financial Reporting & Dashboards",
      description: "Build investor-ready reports and real-time dashboards that turn Zeni data into decisions.",
      category: "Reporting",
      level: CourseLevel.INTERMEDIATE,
      coverColor: "#AD584A",
      modules: [
        {
          title: "Core Financial Statements in Zeni",
          quiz: mcq(
            "Which of these is a core financial statement available in Zeni?",
            [
              "The profit & loss (income) statement",
              "The employee handbook",
              "The office seating chart",
              "The vendor holiday calendar",
            ],
            0
          ),
        },
        {
          title: "Custom Dashboards",
          quiz: mcq(
            "What's the main benefit of building a custom dashboard?",
            [
              "You can track the specific metrics that matter most to your business",
              "It automatically writes your emails",
              "It replaces the need for a bank account",
              "It designs your company website",
            ],
            0
          ),
        },
        {
          title: "Board & Investor Reporting",
          quiz: mcq(
            "What should board and investor reports clearly communicate?",
            [
              "Your company's financial performance and key trends",
              "Your team's lunch preferences",
              "Your office parking policy",
              "Your social media follower count",
            ],
            0
          ),
        },
        {
          title: "KPI Tracking",
          quiz: mcq(
            "Tracking KPIs over time helps you...",
            [
              "Spot trends and make informed decisions",
              "Change your company's name",
              "Order office supplies",
              "Reset employee passwords",
            ],
            0
          ),
        },
      ],
      finalExam: [
        mcq(
          "The profit & loss statement is an example of a...",
          ["Core financial statement", "Marketing report", "HR policy document", "Vendor contract"],
          0
        ),
        mcq(
          "Custom dashboards are valuable because they...",
          [
            "Surface the metrics that matter most to your business",
            "Automatically manage payroll",
            "Replace your bank account",
            "Design your company website",
          ],
          0
        ),
        mcq(
          "Investor reports should clearly communicate...",
          [
            "Financial performance and key trends",
            "Office seating arrangements",
            "Social media engagement",
            "Employee birthdays",
          ],
          0
        ),
        mcq(
          "Tracking KPIs over time helps you...",
          ["Spot trends and make informed decisions", "Change your legal business name", "Order office supplies", "Reset passwords"],
          0
        ),
      ],
    },
    {
      title: "Zeni MCP for Advisors",
      description:
        "Use the Zeni MCP server to connect AI assistants directly to client financial data for advisory workflows.",
      category: "Advisory",
      level: CourseLevel.ADVANCED,
      coverColor: "#162324",
      modules: [
        {
          title: "What is the Zeni MCP Server",
          quiz: mcq(
            "What does the Zeni MCP server enable?",
            [
              "AI assistants can connect directly to client financial data through a standard protocol",
              "It replaces the need for bookkeeping entirely",
              "It manages employee payroll benefits",
              "It hosts your company website",
            ],
            0
          ),
        },
        {
          title: "Connecting Claude to Zeni",
          quiz: mcq(
            "What must you configure to connect an AI assistant like Claude to Zeni via MCP?",
            [
              "The MCP connection and appropriate access permissions",
              "Your company's WiFi password",
              "Your personal calendar",
              "Your email signature",
            ],
            0
          ),
        },
        {
          title: "Advisory Query Patterns",
          quiz: mcq(
            "A good advisory query to an AI assistant connected via MCP would ask about...",
            ["Specific financial trends or figures for a client", "The weather forecast", "Random trivia", "Sports scores"],
            0
          ),
        },
        {
          title: "Client Data Security & Permissions",
          quiz: mcq(
            "Why are granular permissions important when connecting AI assistants to client data?",
            [
              "They ensure assistants only access data they're authorized to see",
              "They make the platform run faster",
              "They change the client's branding",
              "They are not important",
            ],
            0
          ),
        },
      ],
      finalExam: [
        mcq(
          "The Zeni MCP server allows AI assistants to...",
          [
            "Connect directly to client financial data through a standard protocol",
            "Fully replace human bookkeepers",
            "Manage payroll benefits",
            "Host websites",
          ],
          0
        ),
        mcq(
          "Connecting an AI assistant like Claude to Zeni requires...",
          [
            "Proper MCP configuration and access permissions",
            "A new bank account",
            "A different accounting system",
            "No configuration at all",
          ],
          0
        ),
        mcq(
          "Good advisory queries via MCP typically ask about...",
          ["Specific client financial trends or figures", "Unrelated trivia", "The weather", "Sports news"],
          0
        ),
        mcq(
          "Granular permissions matter because they...",
          [
            "Ensure AI assistants only access authorized data",
            "Make the app load faster",
            "Change branding colors",
            "Are optional and rarely used",
          ],
          0
        ),
      ],
    },
  ];

  const courses: Prisma.CourseGetPayload<{
    include: { modules: { include: { quiz: true } }; finalExam: true };
  }>[] = [];

  let videoIndex = 0;
  for (const def of courseDefs) {
    const course = await prisma.course.create({
      data: {
        title: def.title,
        description: def.description,
        category: def.category,
        level: def.level,
        coverColor: def.coverColor,
        durationMins: def.modules.length * 12,
        modules: {
          create: def.modules.map((m, i) => ({
            title: m.title,
            subtitle: m.subtitle ?? null,
            order: i + 1,
            durationMins: 10 + (i % 3) * 5,
            videoUrl: SAMPLE_VIDEOS[videoIndex++ % SAMPLE_VIDEOS.length],
            content: `In this module you'll learn about "${m.title}" and how it fits into the Zeni platform. Watch the video, then pass the quiz below to unlock the next module.`,
            blocks: m.blocks
              ? {
                  create: m.blocks.map((block, bi) => ({
                    type: block.type,
                    order: bi + 1,
                    heading: "heading" in block ? block.heading : null,
                    body: "body" in block ? block.body : null,
                    variant: block.type === "CALLOUT" ? block.variant : null,
                  })),
                }
              : undefined,
          })),
        },
        finalExam: {
          create: {
            passingScore: 75,
            questions: {
              create: def.finalExam.map((q, qi) => ({
                prompt: q.prompt,
                order: qi + 1,
                choices: {
                  create: q.choices.map((text, ci) => ({ text, isCorrect: ci === q.correct, order: ci + 1 })),
                },
              })),
            },
          },
        },
      },
      include: { modules: { include: { quiz: true } }, finalExam: true },
    });

    // Attach a quiz to each module (Module.quiz is a 1:1 relation, created separately).
    for (let i = 0; i < course.modules.length; i++) {
      const moduleRow = course.modules[i];
      const quizDef = def.modules[i].quiz;
      await prisma.quiz.create({
        data: {
          moduleId: moduleRow.id,
          passingScore: 75,
          questions: {
            create: [
              {
                prompt: quizDef.prompt,
                order: 1,
                choices: {
                  create: quizDef.choices.map((text, ci) => ({
                    text,
                    isCorrect: ci === quizDef.correct,
                    order: ci + 1,
                  })),
                },
              },
            ],
          },
        },
      });
    }

    // Re-fetch with quizzes attached now that they exist.
    const withQuizzes = await prisma.course.findUniqueOrThrow({
      where: { id: course.id },
      include: {
        modules: { orderBy: { order: "asc" }, include: { quiz: { include: { questions: { include: { choices: true } } } } } },
        finalExam: { include: { questions: { include: { choices: true } } } },
      },
    });
    courses.push(withQuizzes);
  }

  const [fundamentals, bookkeeping, ap, close, reporting, mcp] = courses;

  async function enroll(
    userId: string,
    course: (typeof courses)[number],
    completedCount: number
  ) {
    const total = course.modules.length;
    const status =
      completedCount === 0
        ? EnrollmentStatus.NOT_STARTED
        : completedCount >= total
          ? EnrollmentStatus.COMPLETED
          : EnrollmentStatus.IN_PROGRESS;

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId: course.id,
        status,
        completedAt: status === EnrollmentStatus.COMPLETED ? new Date() : null,
        progress: {
          create: course.modules.map((m, i) => ({
            moduleId: m.id,
            completed: i < completedCount,
            completedAt: i < completedCount ? new Date() : null,
          })),
        },
      },
    });

    // Record a passing quiz attempt for every module we're marking complete,
    // so the student's history stays consistent with the new pass-to-progress rule.
    for (let i = 0; i < completedCount; i++) {
      const moduleRow = course.modules[i];
      if (moduleRow.quiz) {
        await prisma.quizAttempt.create({
          data: { quizId: moduleRow.quiz.id, userId, score: 100, passed: true, answers: {} },
        });
      }
    }

    if (status === EnrollmentStatus.COMPLETED) {
      if (course.finalExam) {
        await prisma.quizAttempt.create({
          data: { quizId: course.finalExam.id, userId, score: 100, passed: true, answers: {} },
        });
      }
      await prisma.certificate.create({
        data: {
          userId,
          courseId: course.id,
          certNumber: certNumber(`${course.id.slice(-6)}${userId.slice(-4)}`),
        },
      });
    }

    return enrollment;
  }

  // Noah: completed fundamentals, in progress on bookkeeping, not started AP
  await enroll(noah.id, fundamentals, fundamentals.modules.length);
  await enroll(noah.id, bookkeeping, 2);
  await enroll(noah.id, ap, 0);

  // Maya: completed fundamentals + bookkeeping, in progress close, not started reporting/mcp
  await enroll(maya.id, fundamentals, fundamentals.modules.length);
  await enroll(maya.id, bookkeeping, bookkeeping.modules.length);
  await enroll(maya.id, close, 1);
  await enroll(maya.id, reporting, 0);

  // Admin: completed fundamentals + mcp, for a full picture
  await enroll(admin.id, fundamentals, fundamentals.modules.length);
  await enroll(admin.id, mcp, mcp.modules.length);

  await prisma.notification.createMany({
    data: [
      {
        userId: noah.id,
        title: "Certificate earned!",
        message: "You completed Zeni Platform Fundamentals and earned a certificate.",
        type: NotificationType.CERTIFICATE,
        read: false,
      },
      {
        userId: noah.id,
        title: "Course in progress",
        message: "You're 50% through AI Bookkeeping Essentials — keep going!",
        type: NotificationType.INFO,
        read: false,
      },
      {
        userId: noah.id,
        title: "New course available",
        message: "AI Accounts Payable Mastery was just added to the catalog.",
        type: NotificationType.INFO,
        read: true,
      },
      {
        userId: maya.id,
        title: "Certificate earned!",
        message: "You completed AI Bookkeeping Essentials and earned a certificate.",
        type: NotificationType.CERTIFICATE,
        read: false,
      },
      {
        userId: maya.id,
        title: "Reminder",
        message: "Month-End Close with Zeni AI is waiting — you're 25% done.",
        type: NotificationType.WARNING,
        read: false,
      },
      {
        userId: admin.id,
        title: "Weekly digest",
        message: "3 team members made progress on certifications this week.",
        type: NotificationType.INFO,
        read: false,
      },
      {
        userId: admin.id,
        title: "Certificate earned!",
        message: "You completed Zeni MCP for Advisors and earned a certificate.",
        type: NotificationType.CERTIFICATE,
        read: true,
      },
    ],
  });

  console.log("Seed complete:");
  console.log(`  Users: admin@zeni.ai / noah@zeni.ai / maya@zeni.ai`);
  console.log(`  Courses: ${courses.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to parse SQL date format
function parseDate(dateStr: string | null): Date {
  if (!dateStr || dateStr === "\\N" || dateStr.trim() === "") {
    return new Date();
  }
  return new Date(dateStr.replace(" ", "T") + "Z");
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Item Categories");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Seed ItemCategory junction table
    console.log("\n🔗 Seeding ItemCategory relationships...");
    const itemCategories = [
      {
        id: "cmjalw1xq00g5o001by9kg2b8",
        itemId: "cmjalw1xq00g3o00139b9niyy",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-17 22:51:43.695"),
      },
      {
        id: "cmjalx5fi00gbo001m5kkiinh",
        itemId: "cmjalx5fi00g9o001yp81mjv7",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-17 22:52:34.879"),
      },
      {
        id: "cmjalxyv900gho001hqhdpwcs",
        itemId: "cmjalxyv900gfo001ki52vjb1",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-17 22:53:13.03"),
      },
      {
        id: "cmjalyud400gno001vw0ilukn",
        itemId: "cmjalyud300glo001fo8mlq0u",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-17 22:53:53.848"),
      },
      {
        id: "cmjalzfvl00gto001jnjm046w",
        itemId: "cmjalzfvl00gro001bwxukv87",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-17 22:54:21.729"),
      },
      {
        id: "cmjam00vb00gzo001zxi4q8lq",
        itemId: "cmjam00vb00gxo001sh4c5m8r",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-17 22:54:48.935"),
      },
      {
        id: "cmjb1sn9k0003o001xp1415xz",
        itemId: "cmjb1sn9k0001o001gc40zd3a",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 06:16:58.568"),
      },
      {
        id: "cmjb4kjna000to001wwrtntb2",
        itemId: "cmjb4kjna000ro001gezl5yzb",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:34:39.479"),
      },
      {
        id: "cmjb4njhv001bo001vpsei6z9",
        itemId: "cmjb4njhu0019o001hjhqlpja",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:36:59.251"),
      },
      {
        id: "cmjb4nv65001fo001s789nojv",
        itemId: "cmjb4miko0013o0014fml7yyg",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:37:14.381"),
      },
      {
        id: "cmjb4o5u7001jo001l6h0de6q",
        itemId: "cmjb4l7fe000xo001ix6n79x8",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:37:28.207"),
      },
      {
        id: "cmjb4oemp001po001e48y9t0d",
        itemId: "cmjb4oemp001no001h085ykwq",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 07:37:39.601"),
      },
      {
        id: "cmjb4p5hf001vo001oed98c3n",
        itemId: "cmjb4p5hf001to001jf6c7rfl",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:38:14.404"),
      },
      {
        id: "cmjb4q6220021o001ku4qb3m2",
        itemId: "cmjb4q622001zo0012hystt2i",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:39:01.802"),
      },
      {
        id: "cmjb4qyk70027o001ede6cwt7",
        itemId: "cmjb4qyk70025o0014aa6a1ko",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:39:38.743"),
      },
      {
        id: "cmjb4r4f4002do0010o7ra2ub",
        itemId: "cmjb4r4f4002bo001hfug4ic2",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 07:39:46.336"),
      },
      {
        id: "cmjb4sd7a002jo001d9cgohg5",
        itemId: "cmjb4sd7a002ho001skiwcuha",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:40:44.375"),
      },
      {
        id: "cmjb4shjs002po001l59k451s",
        itemId: "cmjb4shjr002no0012vth3snn",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 07:40:50.008"),
      },
      {
        id: "cmjb4tgyk002vo001shgi3evt",
        itemId: "cmjb4tgyk002to001qnwyv4il",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:41:35.9"),
      },
      {
        id: "cmjb4ul9f0031o001emzaogn8",
        itemId: "cmjb4ul9f002zo0018c0g31ez",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 07:42:28.131"),
      },
      {
        id: "cmjb4uujt0037o001ljqp5e16",
        itemId: "cmjb4uujt0035o001mpxx8mgk",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:42:40.169"),
      },
      {
        id: "cmjb4vna9003do001txzl1o24",
        itemId: "cmjb4vna9003bo001l7h3kia6",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 07:43:17.409"),
      },
      {
        id: "cmjb4w1za003jo0018g7alxw9",
        itemId: "cmjb4w1za003ho0011rc1y74i",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:43:36.455"),
      },
      {
        id: "cmjb4xasm003po001191g9qpw",
        itemId: "cmjb4xasm003no001eab14jeg",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:44:34.534"),
      },
      {
        id: "cmjb4yke8003vo001uj477ohg",
        itemId: "cmjb4yke7003to001wdrysuun",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:45:33.632"),
      },
      {
        id: "cmjb4zgsz0041o001qrtsz73e",
        itemId: "cmjb4zgsz003zo001xugrzip6",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:46:15.635"),
      },
      {
        id: "cmjb507xh0047o001oyehywsz",
        itemId: "cmjb507xh0045o001dx2n4pf7",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:46:50.789"),
      },
      {
        id: "cmjb526tv004do0019acvu9kx",
        itemId: "cmjb526tv004bo0016yzuss3r",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:48:22.676"),
      },
      {
        id: "cmjb536n8004jo001rz107dhn",
        itemId: "cmjb536n8004ho001faukyya8",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:49:09.092"),
      },
      {
        id: "cmjb54mhc004po001i30qhckn",
        itemId: "cmjb54mhc004no00198mxdais",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:50:16.273"),
      },
      {
        id: "cmjb568nw004vo001c9abnv0k",
        itemId: "cmjb568nw004to0011pi16xq6",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:51:31.676"),
      },
      {
        id: "cmjb57ut90051o001cbho2viz",
        itemId: "cmjb57ut9004zo001jb6oy4h8",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:52:47.037"),
      },
      {
        id: "cmjb58p4h0057o001cnya77y9",
        itemId: "cmjb58p4h0055o001j47hml0s",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:53:26.321"),
      },
      {
        id: "cmjb5c8th005do0014hy8s7r3",
        itemId: "cmjb5c8th005bo001129suzlx",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:56:11.813"),
      },
      {
        id: "cmjb5d3ze005jo001oi397c4p",
        itemId: "cmjb5d3ze005ho001g35wgzmr",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:56:52.202"),
      },
      {
        id: "cmjb5e3ew005po001fhvcpbqc",
        itemId: "cmjb5e3ew005no001ep9lmua9",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:57:38.121"),
      },
      {
        id: "cmjb5g9al005vo001ng8jzwgv",
        itemId: "cmjb5g9al005to001o1jjx54p",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 07:59:19.053"),
      },
      {
        id: "cmjb669u00061o001rll1xrte",
        itemId: "cmjb669u0005zo0015r9wqvb9",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:19:32.808"),
      },
      {
        id: "cmjb677n00067o001za273e7b",
        itemId: "cmjb677mz0065o001xyd4awb1",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:20:16.62"),
      },
      {
        id: "cmjb67xfl006do001srxzy7xn",
        itemId: "cmjb67xfl006bo001udpdl928",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:20:50.049"),
      },
      {
        id: "cmjb68een006jo001vqwlxdz9",
        itemId: "cmjb68een006ho001b3279jx8",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:21:12.047"),
      },
      {
        id: "cmjb690sg006po001qfgiea6v",
        itemId: "cmjb690sg006no0012d2frbfh",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:21:41.056"),
      },
      {
        id: "cmjb6adz00071o001wahkrt3d",
        itemId: "cmjb6adz0006zo001rlgucuan",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:22:44.796"),
      },
      {
        id: "cmjb6bb7j0077o001s9ceyrlp",
        itemId: "cmjb6bb7j0075o0017okvmebi",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:23:27.871"),
      },
      {
        id: "cmjb6bsur007bo001fsanwvs1",
        itemId: "cmjb6acwb006to001q74aybam",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:23:50.739"),
      },
      {
        id: "cmjb6c3dh007ho001a53w44ba",
        itemId: "cmjb6c3dh007fo001l1q6njrf",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:24:04.373"),
      },
      {
        id: "cmjb6d3s6007no001ecllab91",
        itemId: "cmjb6d3s5007lo001ukdyd5my",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:24:51.558"),
      },
      {
        id: "cmjb6eczf007to001rj5gviom",
        itemId: "cmjb6ecze007ro001v545xo3a",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:25:50.139"),
      },
      {
        id: "cmjb6f1u3007zo001fh2zdkb4",
        itemId: "cmjb6f1u3007xo001jwv9e2se",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:26:22.347"),
      },
      {
        id: "cmjb6fgjj0085o001p7i7whpj",
        itemId: "cmjb6fgji0083o0019o3hrne5",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:26:41.407"),
      },
      {
        id: "cmjb6gpu3008bo0010jbq7j3f",
        itemId: "cmjb6gpu30089o0019mdpj16b",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:27:40.107"),
      },
      {
        id: "cmjb6i323008ho001a5t3xgeb",
        itemId: "cmjb6i323008fo001p796z81p",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:28:43.899"),
      },
      {
        id: "cmjb6iqzr008no001hs9boe8e",
        itemId: "cmjb6iqzr008lo0018jhv4quw",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:29:14.919"),
      },
      {
        id: "cmjb6jcqq008to001j1ur8n4s",
        itemId: "cmjb6jcqq008ro001anc5ivve",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:29:43.106"),
      },
      {
        id: "cmjb6kolf008zo001vv55prru",
        itemId: "cmjb6kolf008xo001owkcmw1c",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:30:45.123"),
      },
      {
        id: "cmjb6krhd0095o001p37fjw79",
        itemId: "cmjb6krhd0093o001x729o3du",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:30:48.865"),
      },
      {
        id: "cmjb6m2r5009bo001ah4cuf9s",
        itemId: "cmjb6m2r50099o0017x7fwm3q",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:31:50.129"),
      },
      {
        id: "cmjb6mihm009ho001wq30xzmf",
        itemId: "cmjb6mihm009fo001vxvd27ph",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:32:10.522"),
      },
      {
        id: "cmjb6o3kb009no001o7vii9og",
        itemId: "cmjb6o3kb009lo001xdda58bl",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:33:24.491"),
      },
      {
        id: "cmjb6pd2h009to001r881yve8",
        itemId: "cmjb6pd2h009ro00167k8lweb",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:34:23.465"),
      },
      {
        id: "cmjb6w882009zo0012clvhj63",
        itemId: "cmjb6w882009xo001lvn1dw3h",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 08:39:43.779"),
      },
      {
        id: "cmjb6xvle00a5o001bojcjbkh",
        itemId: "cmjb6xvle00a3o0010mcg90di",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:41:00.722"),
      },
      {
        id: "cmjb6zhqe00abo0011k6clvh4",
        itemId: "cmjb6zhqe00a9o001x141k3m3",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:42:16.07"),
      },
      {
        id: "cmjb70kee00aho001lp7z38jw",
        itemId: "cmjb70kee00afo001ydh6k6t1",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:43:06.183"),
      },
      {
        id: "cmjb71rx000ano001hyncyluk",
        itemId: "cmjb71rx000alo001ghz6zck0",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:44:02.581"),
      },
      {
        id: "cmjb73suu00ato001wa3ekkcu",
        itemId: "cmjb73suu00aro001hignp110",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:45:37.11"),
      },
      {
        id: "cmjb76bxd00azo0019nwg66bg",
        itemId: "cmjb76bxd00axo0016hkk91v3",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:47:35.137"),
      },
      {
        id: "cmjb77mdx00b5o001ce8tkecs",
        itemId: "cmjb77mdx00b3o001o8ds4v96",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:48:35.349"),
      },
      {
        id: "cmjb7ckqa00bbo00149zez8s2",
        itemId: "cmjb7ckqa00b9o001v9u3apbp",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:52:26.482"),
      },
      {
        id: "cmjb7h9a400bho001tdmv4gc2",
        itemId: "cmjb7h9a400bfo001yrrn0333",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 08:56:04.924"),
      },
      {
        id: "cmjb7sqcg00bno0013wwfykq1",
        itemId: "cmjb7sqcg00blo0013l8lnflr",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:05:00.256"),
      },
      {
        id: "cmjb7u7uj00bto001stxcr982",
        itemId: "cmjb7u7uj00bro001gcg5xjc5",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:06:09.595"),
      },
      {
        id: "cmjb7vh2100bzo0011a1oo15p",
        itemId: "cmjb7vh2100bxo0018akxn7tc",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:07:08.185"),
      },
      {
        id: "cmjb7wx4l00c5o001sjtogkbn",
        itemId: "cmjb7wx4l00c3o001mx08l75v",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:08:15.669"),
      },
      {
        id: "cmjb8237900cbo001e0rb73io",
        itemId: "cmjb8237900c9o001i37dlh30",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:12:16.821"),
      },
      {
        id: "cmjb83awv00clo001zgvwwis6",
        itemId: "cmjb83awv00cjo0014weuj4w1",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:13:13.471"),
      },
      {
        id: "cmjb84fug00cro001w8e39pe5",
        itemId: "cmjb84fug00cpo0015fxbq7n9",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:14:06.52"),
      },
      {
        id: "cmjb87a1d00cxo0014vvlcwih",
        itemId: "cmjb87a1d00cvo001l1qtbzuj",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:16:18.961"),
      },
      {
        id: "cmjb88je600d5o001whv0hhhx",
        itemId: "cmjb885g300d1o001p89amxor",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:17:17.742"),
      },
      {
        id: "cmjb89ly200dbo001w1i3e1c2",
        itemId: "cmjb89ly200d9o001ykiha6bn",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:18:07.706"),
      },
      {
        id: "cmjb8aql400dho0019edkng9g",
        itemId: "cmjb8aql400dfo001o1tvbt4e",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:19:00.377"),
      },
      {
        id: "cmjb8bw5l00dno001t2z2vn81",
        itemId: "cmjb8bw5l00dlo001dyer6xr9",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:19:54.249"),
      },
      {
        id: "cmjb8d9oc00dto001yd1xridl",
        itemId: "cmjb8d9oc00dro00160ppmsuu",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:20:58.428"),
      },
      {
        id: "cmjb8ea1200e3o001moc24qd9",
        itemId: "cmjb8ea1200e1o001h9qrc7v2",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:21:45.542"),
      },
      {
        id: "cmjb8fgef00f2o001plcrdlpn",
        itemId: "cmjb8fgef00f0o001zrg2yuy3",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:22:40.455"),
      },
      {
        id: "cmjb8gobx00f8o00170ojzt4h",
        itemId: "cmjb8gobx00f6o001arvkx0zi",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:23:37.39"),
      },
      {
        id: "cmjb8hr2y00feo001chy9lgm9",
        itemId: "cmjb8hr2y00fco001op7j406g",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:24:27.61"),
      },
      {
        id: "cmjb8j49r00fko0018htf380d",
        itemId: "cmjb8j49r00fio0011eh5cci7",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:25:31.359"),
      },
      {
        id: "cmjb8kap600fqo001qt92fo9s",
        itemId: "cmjb8kap600foo0018vc734k2",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:26:26.347"),
      },
      {
        id: "cmjb8lmvw00fwo001902en0gg",
        itemId: "cmjb8lmvw00fuo001cj9kowui",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:27:28.797"),
      },
      {
        id: "cmjb8nl7k00g2o001ux4aa1cz",
        itemId: "cmjb8nl7j00g0o001fj7y7qpf",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:28:59.936"),
      },
      {
        id: "cmjb8oho800g8o001y6zy49dy",
        itemId: "cmjb8oho800g6o001ozbl7e63",
        categoryId: "cmjb4g9od000no001a4onyf2s",
        createdAt: parseDate("2025-12-18 09:29:42.008"),
      },
      {
        id: "cmjbts2150003o0012ptrigi9",
        itemId: "cmjbts2140001o001jhu4hh8o",
        categoryId: "cmjalu72i00fzo001p2pmrebj",
        createdAt: parseDate("2025-12-18 19:20:20.297"),
      },
      {
        id: "cmjdvfx93000io0018sznwcob",
        itemId: "cmjdvfx93000go001mxemhd2j",
        categoryId: "cmjdve7lc000co001nc7nemhf",
        createdAt: parseDate("2025-12-20 05:42:25.815"),
      },
      {
        id: "cmjdvh1y0000oo001z49v8rmn",
        itemId: "cmjdvh1xz000mo001u55bqet0",
        categoryId: "cmjdve7lc000co001nc7nemhf",
        createdAt: parseDate("2025-12-20 05:43:18.552"),
      },
      {
        id: "cmjdvippt000uo001cwqvxb44",
        itemId: "cmjdvippt000so0017eog82wb",
        categoryId: "cmjdve7lc000co001nc7nemhf",
        createdAt: parseDate("2025-12-20 05:44:36.017"),
      },
    ];

    for (const itemCategory of itemCategories) {
      await prisma.itemCategory.upsert({
        where: {
          itemId_categoryId: {
            itemId: itemCategory.itemId,
            categoryId: itemCategory.categoryId,
          },
        },
        update: {
          createdAt: itemCategory.createdAt,
        },
        create: itemCategory,
      });
      console.log(`✅ Upserted ItemCategory: ${itemCategory.itemId} -> ${itemCategory.categoryId}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ SUCCESS: Seeded ${itemCategories.length} item-category relationships!`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR: Seeding failed!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("💥 Fatal error details:", e);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


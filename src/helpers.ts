export function fmtCurrency(n: number): string {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
export function fmtDate(s: string): string {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function statusBadge(status: string): string {
  switch (status) {
    case "Active": return "badge-active";
    case "Past Due": return "badge-past-due";
    case "Closed": case "Written Off": return "badge-closed";
    case "Vacant": return "badge-vacant";
    case "Paid Off": return "badge-paid";
    default: return "";
  }
}

export const BIBLE_VERSES = [
  { verse: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11" },
  { verse: "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.", ref: "Psalm 23:1-3" },
  { verse: "Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge Him, and He will make straight your paths.", ref: "Proverbs 3:5-6" },
  { verse: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { verse: "The Lord bless you and keep you; the Lord make His face shine on you and be gracious to you; the Lord turn His face toward you and give you peace.", ref: "Numbers 6:24-26" },
  { verse: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", ref: "Joshua 1:9" },
  { verse: "And we know that in all things God works for the good of those who love Him, who have been called according to His purpose.", ref: "Romans 8:28" },
  { verse: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
  { verse: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", ref: "Psalm 34:18" },
  { verse: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", ref: "Isaiah 40:31" },
  { verse: "Delight yourself in the Lord, and He will give you the desires of your heart.", ref: "Psalm 37:4" },
  { verse: "The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?", ref: "Psalm 27:1" },
  { verse: "Cast all your anxiety on Him because He cares for you.", ref: "1 Peter 5:7" },
  { verse: "God is our refuge and strength, an ever-present help in trouble.", ref: "Psalm 46:1" },
  { verse: "His mercies are new every morning; great is Your faithfulness.", ref: "Lamentations 3:23" },
  { verse: "The joy of the Lord is your strength.", ref: "Nehemiah 8:10" },
  { verse: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { verse: "Every good and perfect gift is from above, coming down from the Father of the heavenly lights.", ref: "James 1:17" },
  { verse: "He has made everything beautiful in its time.", ref: "Ecclesiastes 3:11" },
  { verse: "The Lord is gracious and compassionate, slow to anger and rich in love.", ref: "Psalm 145:8" },
  { verse: "Peace I leave with you; my peace I give you. Do not let your hearts be troubled and do not be afraid.", ref: "John 14:27" },
  { verse: "She is clothed with strength and dignity; she can laugh at the days to come.", ref: "Proverbs 31:25" },
  { verse: "Let all that you do be done in love.", ref: "1 Corinthians 16:14" },
  { verse: "Commit to the Lord whatever you do, and He will establish your plans.", ref: "Proverbs 16:3" },
  { verse: "The Lord will fight for you; you need only to be still.", ref: "Exodus 14:14" },
  { verse: "Give thanks to the Lord, for He is good; His love endures forever.", ref: "Psalm 107:1" },
  { verse: "A generous person will prosper; whoever refreshes others will be refreshed.", ref: "Proverbs 11:25" },
  { verse: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in His love He will no longer rebuke you, but will rejoice over you with singing.", ref: "Zephaniah 3:17" },
  { verse: "For where your treasure is, there your heart will be also.", ref: "Matthew 6:21" },
  { verse: "You are the light of the world. A town built on a hill cannot be hidden.", ref: "Matthew 5:14" },
  { verse: "In all your ways submit to Him, and He will make your paths straight.", ref: "Proverbs 3:6" },
];

export function getDailyVerse() {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return BIBLE_VERSES[dayOfYear % BIBLE_VERSES.length];
}

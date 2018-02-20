
var regexEnglish = /[^\w]be[^\w]|[^\w]have[^\w]|[^\w]do[^\w]|[^\w]say[^\w]|[^\w]get[^\w]|[^\w]make[^\w]|[^\w]go[^\w]|[^\w]know[^\w]|[^\w]take[^\w]|[^\w]see[^\w]|[^\w]come[^\w]|[^\w]think[^\w]|[^\w]look[^\w]|[^\w]want[^\w]|[^\w]give[^\w]|[^\w]use[^\w]|[^\w]find[^\w]|[^\w]tell[^\w]|[^\w]ask[^\w]|[^\w]work[^\w]|[^\w]good[^\w]|[^\w]new[^\w]|[^\w]first[^\w]|[^\w]last[^\w]|[^\w]long[^\w]|[^\w]great[^\w]|[^\w]little[^\w]|[^\w]own[^\w]|[^\w]other[^\w]|[^\w]old[^\w]|[^\w]right[^\w]|[^\w]big[^\w]|[^\w]high[^\w]|[^\w]different[^\w]|[^\w]small[^\w]|[^\w]large[^\w]|[^\w]next[^\w]|[^\w]early[^\w]|[^\w]young[^\w]|[^\w]important[^\w]|[^\w]few[^\w]|[^\w]public[^\w]|[^\w]bad[^\w]|[^\w]same[^\w]|[^\w]able[^\w]|[^\w]seem[^\w]|[^\w]feel[^\w]|[^\w]try[^\w]|[^\w]leave[^\w]|[^\w]call[^\w]|[^\w]to[^\w]|[^\w]of[^\w]|[^\w]in[^\w]|[^\w]for[^\w]|[^\w]on[^\w]|[^\w]with[^\w]|[^\w]at[^\w]|[^\w]by[^\w]|[^\w]from[^\w]|[^\w]up[^\w]|[^\w]about[^\w]|[^\w]into[^\w]|[^\w]over[^\w]|[^\w]after[^\w]|[^\w]the[^\w]|[^\w]and[^\w]|[^\w]a[^\w]|[^\w]that[^\w]|[^\w]I[^\w]|[^\w]it[^\w]|[^\w]not[^\w]|[^\w]he[^\w]|[^\w]as[^\w]|[^\w]you[^\w]|[^\w]this[^\w]|[^\w]but[^\w]|[^\w]his[^\w]|[^\w]they[^\w]|[^\w]her[^\w]|[^\w]she[^\w]|[^\w]or[^\w]|[^\w]an[^\w]|[^\w]will[^\w]|[^\w]my[^\w]|[^\w]one[^\w]|[^\w]all[^\w]|[^\w]would[^\w]|[^\w]there[^\w]|[^\w]their[^\w]/g;

function isTextInEnglish(text) {
    var matches = text.match(regexEnglish);
    var occurances = matches ? matches.length : 0;
    var englishSpeechRatio = occurances / text.length;

    return {
        length: text.length,
        occurances: occurances,
        englishSpeechRatio: englishSpeechRatio,
        isEnglish: englishSpeechRatio > 0.04
    };
}

module.exports = {
    isTextInEnglish: isTextInEnglish
}
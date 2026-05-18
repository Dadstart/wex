using System.Text.Json.Serialization;

namespace Wex.Server.Services;

internal sealed class TreasuryRatesResponse
{
    [JsonPropertyName("data")]
    public List<TreasuryRateRow> Data { get; set; } = [];
}

internal sealed class TreasuryRateRow
{
    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "";

    [JsonPropertyName("record_date")]
    public string RecordDate { get; set; } = "";

    [JsonPropertyName("exchange_rate")]
    public string ExchangeRate { get; set; } = "";
}

internal sealed class TreasuryCurrenciesResponse
{
    [JsonPropertyName("data")]
    public List<TreasuryCurrencyRow> Data { get; set; } = [];
}

internal sealed class TreasuryCurrencyRow
{
    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "";
}
